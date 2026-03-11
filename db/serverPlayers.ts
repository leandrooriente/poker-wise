import { Player } from "@/types/player";

/**
 * Server-backed player operations.
 * Calls the admin API endpoints for player CRUD.
 */

/**
 * Get all players in a group.
 */
export async function getPlayersForGroup(groupId: string): Promise<Player[]> {
  const response = await fetch(`/api/admin/groups/${groupId}/players`, {
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      // Not authorized - return empty array
      return [];
    }
    throw new Error(`Failed to fetch players: ${response.status}`);
  }

  const data = await response.json();
  return data.map((p: any) => ({
    id: p.id,
    name: p.name,
    notes: p.notes ?? undefined,
    createdAt: p.createdAt,
  }));
}

/**
 * Add a new player to a group.
 */
export async function addPlayerToGroup(
  groupId: string,
  player: Omit<Player, "id" | "createdAt">
): Promise<Player> {
  const response = await fetch(`/api/admin/groups/${groupId}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: player.name,
      notes: player.notes,
    }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Admin permission required to add players");
    }
    throw new Error(`Failed to add player: ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    notes: data.notes ?? undefined,
    createdAt: data.createdAt,
  };
}

/**
 * Update a player's name or notes.
 */
export async function updatePlayerInGroup(
  groupId: string,
  playerId: string,
  updates: { name?: string; notes?: string | null }
): Promise<Player> {
  const response = await fetch(`/api/admin/groups/${groupId}/players`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      id: playerId,
      name: updates.name,
      notes: updates.notes,
    }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Admin permission required to update players");
    }
    throw new Error(`Failed to update player: ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    notes: data.notes ?? undefined,
    createdAt: data.createdAt,
  };
}

/**
 * Delete a player from a group.
 */
export async function deletePlayerFromGroup(
  groupId: string,
  playerId: string
): Promise<void> {
  const response = await fetch(
    `/api/admin/groups/${groupId}/players?id=${encodeURIComponent(playerId)}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Admin permission required to delete players");
    }
    throw new Error(`Failed to delete player: ${response.status}`);
  }
}
