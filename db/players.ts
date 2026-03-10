// Compatibility layer for legacy player operations.
// Uses the new user/group model under the hood.
// Assumes default group "home-game" for migration compatibility.
// TODO: Remove this file once all pages are updated to use users/groups directly.

import { generateId } from "@/lib/uuid";
import { Player } from "@/types/player";
import { getUsers, addUser, updateUser, deleteUser } from "./users";
import { getGroups, addGroup } from "./groups";
import { getGroupMembers, addGroupMember, removeGroupMember } from "./members";
import { runMigrationIfNeeded } from "./migrate";

const DEFAULT_GROUP_ID = "home-game";

async function ensureDefaultGroup(): Promise<void> {
  await runMigrationIfNeeded();
  // Ensure default group exists even if migration was skipped
  const groups = await getGroups();
  let defaultGroup = groups.find(g => g.id === DEFAULT_GROUP_ID);
  if (!defaultGroup) {
    console.log('[players] Default group not found, creating it');
    defaultGroup = await addGroup({ id: DEFAULT_GROUP_ID });
    console.log('[players] Default group created:', defaultGroup);
  } else {
    console.log('[players] Default group exists:', defaultGroup.id);
  }
}

export async function getPlayers(): Promise<Player[]> {
  console.log('[players] getPlayers called');
  await ensureDefaultGroup();
  const users = await getUsers();
  const members = await getGroupMembers();
  console.log('[players] users count:', users.length, 'members count:', members.length);
  const defaultGroupMembers = members.filter(m => m.groupId === DEFAULT_GROUP_ID);
  const memberUserIds = new Set(defaultGroupMembers.map(m => m.userId));
  console.log('[players] default group members:', defaultGroupMembers.length, 'memberUserIds:', Array.from(memberUserIds));
  
  const filtered = users.filter(u => memberUserIds.has(u.id));
  console.log('[players] returning players:', filtered.length);
  // Convert users to legacy Player format (notes/preferredBuyIn omitted)
  return filtered.map(user => ({
    id: user.id,
    name: user.name,
    createdAt: user.createdAt,
    // notes and preferredBuyIn are omitted (undefined)
  }));
}

export async function savePlayers(players: Player[]): Promise<void> {
  // This function is rarely used; we can implement it if needed.
  // For now, we'll ignore because the new model doesn't map 1:1.
  console.warn("savePlayers is deprecated; use user/group member APIs instead");
}

export async function addPlayer(player: Omit<Player, "id" | "createdAt">): Promise<Player> {
  console.log('[players] addPlayer called:', player.name);
  await ensureDefaultGroup();
  // Create a new global user
  const newUser = await addUser({
    name: player.name,
  });
  console.log('[players] User created:', newUser.id);
  // Add user to default group
  await addGroupMember({
    groupId: DEFAULT_GROUP_ID,
    userId: newUser.id,
  });
  console.log('[players] User added to default group');
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