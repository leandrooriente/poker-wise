// Compatibility layer for legacy player operations.
// Uses the new user/group model under the hood.
// Assumes default group "home-game" for migration compatibility.
// TODO: Remove this file once all pages are updated to use users/groups directly.

import { getGroups, addGroup } from "./groups";
import { getGroupMembers, addGroupMember, removeGroupMember } from "./members";
import { runMigrationIfNeeded } from "./migrate";
import { getUsers, addUser, updateUser, deleteUser } from "./users";


import { Player } from "@/types/player";

const DEFAULT_GROUP_ID = "home-game";

async function ensureDefaultGroup(): Promise<void> {
  await runMigrationIfNeeded();
  // Ensure default group exists even if migration was skipped
  const groups = await getGroups();
  let defaultGroup = groups.find(g => g.id === DEFAULT_GROUP_ID);
  if (!defaultGroup) {
    defaultGroup = await addGroup({ id: DEFAULT_GROUP_ID, name: "Home Game" });
  }
}

export async function getPlayers(): Promise<Player[]> {

  await ensureDefaultGroup();
  const users = await getUsers();
  const members = await getGroupMembers();

  const defaultGroupMembers = members.filter(m => m.groupId === DEFAULT_GROUP_ID);
  const memberUserIds = new Set(defaultGroupMembers.map(m => m.userId));

  
  const filtered = users.filter(u => memberUserIds.has(u.id));

  // Convert users to legacy Player format (notes/preferredBuyIn omitted)
  return filtered.map(user => ({
    id: user.id,
    name: user.name,
    createdAt: user.createdAt,
    // notes and preferredBuyIn are omitted (undefined)
  }));
}

export async function getPlayersForGroup(groupId: string): Promise<Player[]> {

  const users = await getUsers();
  const members = await getGroupMembers();
  const groupMembers = members.filter(m => m.groupId === groupId);
  const memberUserIds = new Set(groupMembers.map(m => m.userId));
  const filtered = users.filter(u => memberUserIds.has(u.id));
  // Convert users to legacy Player format (notes/preferredBuyIn omitted)
  return filtered.map(user => ({
    id: user.id,
    name: user.name,
    createdAt: user.createdAt,
  }));
}

export async function savePlayers(_players: Player[]): Promise<void> {
  // This function is rarely used; we can implement it if needed.
  // For now, we'll ignore because the new model doesn't map 1:1.
  // eslint-disable-next-line no-console
  console.warn("savePlayers is deprecated; use user/group member APIs instead");
}

export async function addPlayer(player: Omit<Player, "id" | "createdAt">): Promise<Player> {

  await ensureDefaultGroup();
  // Create a new global user
  const newUser = await addUser({
    name: player.name,
  });

  // Add user to default group
  await addGroupMember({
    groupId: DEFAULT_GROUP_ID,
    userId: newUser.id,
  });

  // Return legacy Player format (without notes/preferredBuyIn)
  return {
    id: newUser.id,
    name: newUser.name,
    createdAt: newUser.createdAt,
  };
}

export async function updatePlayer(updatedPlayer: Player): Promise<void> {
  await ensureDefaultGroup();
  // Update user name only (notes/preferredBuyIn ignored)
  await updateUser({
    id: updatedPlayer.id,
    name: updatedPlayer.name,
    createdAt: updatedPlayer.createdAt,
  });
}

export async function deletePlayer(id: string): Promise<void> {
  await ensureDefaultGroup();
  // Remove user from default group, but keep global user (could be in other groups)
  await removeGroupMember(DEFAULT_GROUP_ID, id);
  // Optionally delete global user if not member of any other group
  const members = await getGroupMembers();
  if (!members.some(m => m.userId === id)) {
    await deleteUser(id);
  }
}