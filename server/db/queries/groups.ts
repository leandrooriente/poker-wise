import { db } from "@/server/db";
import { groups, groupAdmins } from "@/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

export interface CreateGroupInput {
  id: string; // slug
  name: string;
  createdByAdminId: string;
}

export interface GroupWithAdminRole {
  id: string;
  name: string;
  slug: string;
  createdByAdminId: string;
  createdAt: Date;
  role: string;
}

/**
 * Create a new group and add the creating admin to group_admins with role 'admin'.
 */
export async function createGroup(input: CreateGroupInput): Promise<GroupWithAdminRole> {
  const { id: slug, name, createdByAdminId } = input;
  
  // Generate UUID for primary key
  const groupId = crypto.randomUUID();
  
  // Insert group
  const [group] = await db.insert(groups).values({
    id: groupId,
    name,
    slug,
    createdByAdminId,
  }).returning();

  // Add creating admin to group_admins
  await db.insert(groupAdmins).values({
    groupId,
    adminId: createdByAdminId,
    role: "admin",
  });

  return {
    ...group,
    role: "admin",
  };
}

/**
 * Get all groups where the given admin is a member (via group_admins).
 */
export async function getGroupsForAdmin(adminId: string): Promise<GroupWithAdminRole[]> {
  const result = await db
    .select({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
      createdByAdminId: groups.createdByAdminId,
      createdAt: groups.createdAt,
      role: groupAdmins.role,
    })
    .from(groups)
    .innerJoin(groupAdmins, eq(groups.id, groupAdmins.groupId))
    .where(eq(groupAdmins.adminId, adminId))
    .orderBy(desc(groups.createdAt));

  return result;
}

/**
 * Get a single group by ID, only if the admin is a member.
 */
export async function getGroupForAdmin(groupId: string, adminId: string): Promise<GroupWithAdminRole | undefined> {
  const [result] = await db
    .select({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
      createdByAdminId: groups.createdByAdminId,
      createdAt: groups.createdAt,
      role: groupAdmins.role,
    })
    .from(groups)
    .innerJoin(groupAdmins, eq(groups.id, groupAdmins.groupId))
    .where(and(eq(groups.id, groupId), eq(groupAdmins.adminId, adminId)));

  return result;
}

/**
 * Update group name (and optionally slug) for a group the admin belongs to.
 */
export async function updateGroupForAdmin(
  groupId: string,
  adminId: string,
  updates: { name?: string; slug?: string }
): Promise<GroupWithAdminRole | undefined> {
  // First verify admin is a member (and optionally check role)
  const membership = await db.query.groupAdmins.findFirst({
    where: and(eq(groupAdmins.groupId, groupId), eq(groupAdmins.adminId, adminId)),
  });
  if (!membership) {
    return undefined;
  }

  const [updated] = await db
    .update(groups)
    .set({
      ...(updates.name && { name: updates.name }),
      ...(updates.slug && { slug: updates.slug }),
    })
    .where(eq(groups.id, groupId))
    .returning();

  return {
    ...updated,
    role: membership.role,
  };
}

/**
 * Delete a group (cascading deletes will clean up group_admins, players, matches, etc.)
 * Only allowed if the admin is a member with role 'admin'.
 */
export async function deleteGroupForAdmin(groupId: string, adminId: string): Promise<boolean> {
  const membership = await db.query.groupAdmins.findFirst({
    where: and(eq(groupAdmins.groupId, groupId), eq(groupAdmins.adminId, adminId), eq(groupAdmins.role, "admin")),
  });
  if (!membership) {
    return false;
  }

  await db.delete(groups).where(eq(groups.id, groupId));
  return true;
}

/**
 * Add another admin to a group (requires existing admin role 'admin').
 */
export async function addAdminToGroup(
  groupId: string,
  adminId: string,
  targetAdminId: string,
  role: string = "member"
): Promise<boolean> {
  const membership = await db.query.groupAdmins.findFirst({
    where: and(eq(groupAdmins.groupId, groupId), eq(groupAdmins.adminId, adminId), eq(groupAdmins.role, "admin")),
  });
  if (!membership) {
    return false;
  }

  await db.insert(groupAdmins).values({
    groupId,
    adminId: targetAdminId,
    role,
  }).onConflictDoNothing({ target: [groupAdmins.groupId, groupAdmins.adminId] });

  return true;
}

/**
 * Get a single group by slug, only if the admin is a member.
 */
export async function getGroupBySlugForAdmin(slug: string, adminId: string): Promise<GroupWithAdminRole | undefined> {
  const [result] = await db
    .select({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
      createdByAdminId: groups.createdByAdminId,
      createdAt: groups.createdAt,
      role: groupAdmins.role,
    })
    .from(groups)
    .innerJoin(groupAdmins, eq(groups.id, groupAdmins.groupId))
    .where(and(eq(groups.slug, slug), eq(groupAdmins.adminId, adminId)));

  return result;
}