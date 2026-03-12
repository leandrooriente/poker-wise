import { hash } from "bcryptjs";

import { eq, inArray } from "drizzle-orm";

import { db } from "@/server/db";
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

type Transaction = Parameters<typeof db.transaction>[0] extends (
  tx: infer T,
  ...args: never[]
) => Promise<unknown>
  ? T
  : never;

export async function createAdminWithAccess(
  options: CreateAdminOptions
): Promise<CreateAdminResult> {
  return db.transaction(async (tx: Transaction) => {
    const existingAdmin = await tx.query.admins.findFirst({
      where: eq(admins.email, options.email),
    });
    if (existingAdmin) {
      throw new Error(`Admin already exists for ${options.email}`);
    }

    const passwordHash = await hash(options.password, 10);
    const [admin] = await tx
      .insert(admins)
      .values({
        email: options.email,
        passwordHash,
      })
      .returning();

    let targetGroups: Array<{ id: string; slug: string }> = [];
    if (options.grantAllGroups) {
      targetGroups = await tx
        .select({ id: groups.id, slug: groups.slug })
        .from(groups);
    } else if (options.groupSlugs.length > 0) {
      targetGroups = await tx
        .select({ id: groups.id, slug: groups.slug })
        .from(groups)
        .where(inArray(groups.slug, options.groupSlugs));

      const foundSlugs = new Set(targetGroups.map((group) => group.slug));
      const missingSlugs = options.groupSlugs.filter(
        (slug) => !foundSlugs.has(slug)
      );
      if (missingSlugs.length > 0) {
        throw new Error(`Unknown group slug(s): ${missingSlugs.join(", ")}`);
      }
    }

    if (targetGroups.length > 0) {
      await tx.insert(groupAdmins).values(
        targetGroups.map((group) => ({
          groupId: group.id,
          adminId: admin.id,
          role: options.role,
        }))
      );
    }

    return {
      email: admin.email,
      grantedGroupSlugs: targetGroups.map((group) => group.slug),
    };
  });
}
