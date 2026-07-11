import { hash } from "bcryptjs";
import { eq, inArray } from "drizzle-orm";

import { generateId } from "@/lib/uuid";
import { getDb, type Database } from "@/server/db";
import { admins, groupAdmins, groups } from "@/server/db/schema";

export interface CreateAdminOptions {
  email: string;
  password: string;
  groupSlugs: string[];
  grantAllGroups: boolean;
  role: string;
}

export interface CreateAdminResult {
  email: string;
  grantedGroupSlugs: string[];
}

const GROUP_SLUG_CHUNK_SIZE = 90;

async function findTargetGroups(
  database: Database,
  options: CreateAdminOptions
): Promise<Array<{ id: string; slug: string }>> {
  if (options.grantAllGroups) {
    return database.select({ id: groups.id, slug: groups.slug }).from(groups);
  }

  const targetGroups: Array<{ id: string; slug: string }> = [];
  for (
    let offset = 0;
    offset < options.groupSlugs.length;
    offset += GROUP_SLUG_CHUNK_SIZE
  ) {
    const slugs = options.groupSlugs.slice(
      offset,
      offset + GROUP_SLUG_CHUNK_SIZE
    );
    targetGroups.push(
      ...(await database
        .select({ id: groups.id, slug: groups.slug })
        .from(groups)
        .where(inArray(groups.slug, slugs)))
    );
  }

  const foundSlugs = new Set(targetGroups.map((group) => group.slug));
  const missingSlugs = options.groupSlugs.filter(
    (slug) => !foundSlugs.has(slug)
  );
  if (missingSlugs.length > 0) {
    throw new Error(`Unknown group slug(s): ${missingSlugs.join(", ")}`);
  }

  return targetGroups;
}

export async function createAdminWithAccess(
  options: CreateAdminOptions,
  database: Database = getDb()
): Promise<CreateAdminResult> {
  const existingAdmin = await database.query.admins.findFirst({
    where: eq(admins.email, options.email),
  });
  if (existingAdmin) {
    throw new Error(`Admin already exists for ${options.email}`);
  }

  const targetGroups = await findTargetGroups(database, options);
  const adminId = generateId();
  const passwordHash = await hash(options.password, 10);
  const insertAdmin = database
    .insert(admins)
    .values({
      id: adminId,
      email: options.email,
      passwordHash,
    })
    .returning({ email: admins.email });

  let email: string;
  if (targetGroups.length === 0) {
    const [admin] = await insertAdmin;
    email = admin.email;
  } else {
    const [createdAdmins] = await database.batch([
      insertAdmin,
      database.insert(groupAdmins).values(
        targetGroups.map((group) => ({
          groupId: group.id,
          adminId,
          role: options.role,
        }))
      ),
    ]);
    email = createdAdmins[0].email;
  }

  return {
    email,
    grantedGroupSlugs: targetGroups.map((group) => group.slug),
  };
}
