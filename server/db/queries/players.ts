import { eq, and, desc } from "drizzle-orm";

import { generateId } from "@/lib/uuid";
import { db } from "@/server/db";
import { players, groupAdmins } from "@/server/db/schema";

export interface CreatePlayerInput {
  name: string;
  notes?: string;
  groupId: string; // UUID of the group
}

export interface PlayerWithGroup {
  id: string;
  groupId: string;
  name: string;
  notes: string | null;
  createdAt: Date;
}

/**
 * Verify that an admin is a member of a group.
 */
async function verifyAdminMembership(
  groupId: string,
  adminId: string
): Promise<boolean> {
  const membership = await db.query.groupAdmins.findFirst({
    where: and(
      eq(groupAdmins.groupId, groupId),
      eq(groupAdmins.adminId, adminId)
    ),
  });
  return !!membership;
}

/**
 * Get a player's group ID.
 */
async function getPlayerGroupId(playerId: string): Promise<string | undefined> {
  const player = await db.query.players.findFirst({
    where: eq(players.id, playerId),
    columns: { groupId: true },
  });
  return player?.groupId;
}

/**
 * Create a new player in a group, only if the admin is a member of the group.
 */
export async function createPlayer(
  input: CreatePlayerInput,
  adminId: string
): Promise<PlayerWithGroup | undefined> {
  if (!(await verifyAdminMembership(input.groupId, adminId))) {
    return undefined;
  }

  const [player] = await db
    .insert(players)
    .values({
      id: generateId(),
      name: input.name,
      notes: input.notes,
      groupId: input.groupId,
    })
    .returning();

  return player;
}

/**
 * Get all players in a group, only if the admin is a member of the group.
 */
export async function getPlayersForGroup(
  groupId: string,
  adminId: string
): Promise<PlayerWithGroup[]> {
  if (!(await verifyAdminMembership(groupId, adminId))) {
    return [];
  }

  const result = await db
    .select()
    .from(players)
    .where(eq(players.groupId, groupId))
    .orderBy(desc(players.createdAt));

  return result;
}

/**
 * Get a single player by ID, only if the admin is a member of the player's group.
 */
export async function getPlayerForAdmin(
  playerId: string,
  adminId: string
): Promise<PlayerWithGroup | undefined> {
  const groupId = await getPlayerGroupId(playerId);
  if (!groupId) return undefined;

  if (!(await verifyAdminMembership(groupId, adminId))) {
    return undefined;
  }

  const player = await db.query.players.findFirst({
    where: eq(players.id, playerId),
  });
  return player ?? undefined;
}

/**
 * Update a player's name or notes, only if the admin is a member of the player's group.
 */
export async function updatePlayerForAdmin(
  playerId: string,
  adminId: string,
  updates: { name?: string; notes?: string | null }
): Promise<PlayerWithGroup | undefined> {
  const groupId = await getPlayerGroupId(playerId);
  if (!groupId) return undefined;

  if (!(await verifyAdminMembership(groupId, adminId))) {
    return undefined;
  }

  const [updated] = await db
    .update(players)
    .set({
      ...(updates.name && { name: updates.name }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
    })
    .where(eq(players.id, playerId))
    .returning();

  return updated;
}

/**
 * Delete a player, only if the admin is a member of the player's group.
 */
export async function deletePlayerForAdmin(
  playerId: string,
  adminId: string
): Promise<boolean> {
  const groupId = await getPlayerGroupId(playerId);
  if (!groupId) return false;

  if (!(await verifyAdminMembership(groupId, adminId))) {
    return false;
  }

  await db.delete(players).where(eq(players.id, playerId));
  return true;
}
