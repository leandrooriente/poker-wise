// Server-backed player operations.
// Calls the new admin API endpoints for player CRUD.

import { Player } from "@/types/player";

const DEFAULT_GROUP_ID = "home-game";

/**
 * Get all players in the default group (legacy compatibility).
 * @deprecated Use getPlayersForGroup with explicit group ID.
 */
export async function getPlayers(): Promise<Player[]> {
  return getPlayersForGroup(DEFAULT_GROUP_ID);
}

/**
 * Get all players in a specific group.
 */
export async function getPlayersForGroup(groupId: string): Promise<Player[]> {
  try {
    const res = await fetch(`/api/admin/groups/${groupId}/players`, {
      credentials: "include",
    });

    if (!res.ok) {
      // If unauthorized, the user is not an admin; return empty array for compatibility.
      // This allows non‑admin pages (e.g., public share) to still load players
      // once we have read‑only endpoints (PR 8).
      if (res.status === 401 || res.status === 403) {
        console.warn(
          `No admin permission to fetch players for group ${groupId}; returning empty list.`
        );
        return [];
      }
      throw new Error(`Failed to fetch players: ${res.status}`);
    }

    const data = await res.json();
    // API returns notes, but not preferredBuyIn.
    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      notes: p.notes ?? undefined,
      createdAt: p.createdAt,
    }));
  } catch (err) {
    console.error("getPlayersForGroup failed:", err);
    // Fallback to empty array for offline/local‑first compatibility.
    return [];
  }
}

/**
 * Save a list of players (legacy compatibility).
 * @deprecated Not supported in server‑backed model.
 */
export async function savePlayers(_players: Player[]): Promise<void> {
  console.warn(
    "savePlayers is deprecated; use individual player CRUD endpoints instead"
  );
}

/**
 * Add a new player to the default group.
 * @deprecated Use group‑specific player creation via UI.
 */
export async function addPlayer(
  player: Omit<Player, "id" | "createdAt">
): Promise<Player> {
  // The legacy UI does not specify a group; we use the default group.
  // This will fail if the default group doesn't exist in the backend.
  // For compatibility, we attempt to create the player in the default group.
  try {
    const res = await fetch(`/api/admin/groups/${DEFAULT_GROUP_ID}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: player.name,
        notes: player.notes,
      }),
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("Admin permission required to add players");
      }
      throw new Error(`Failed to add player: ${res.status}`);
    }

    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      notes: data.notes ?? undefined,
      createdAt: data.createdAt,
    };
  } catch (err) {
    console.error("addPlayer failed:", err);
    // Re‑throw to let UI handle the error.
    throw err;
  }
}

/**
 * Update an existing player's name (and optionally notes).
 */
export async function updatePlayer(updatedPlayer: Player): Promise<void> {
  // Determine group ID from the player – we don't have it.
  // The legacy UI only updates name, and the player is assumed to be in the default group.
  // We'll try to update using the player's ID; the API will verify admin membership.
  try {
    const res = await fetch(`/api/admin/groups/${DEFAULT_GROUP_ID}/players`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id: updatedPlayer.id,
        name: updatedPlayer.name,
        notes: updatedPlayer.notes,
      }),
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("Admin permission required to update players");
      }
      throw new Error(`Failed to update player: ${res.status}`);
    }
  } catch (err) {
    console.error("updatePlayer failed:", err);
    throw err;
  }
}

/**
 * Delete a player from the default group.
 */
export async function deletePlayer(id: string): Promise<void> {
  try {
    const res = await fetch(
      `/api/admin/groups/${DEFAULT_GROUP_ID}/players?id=${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("Admin permission required to delete players");
      }
      throw new Error(`Failed to delete player: ${res.status}`);
    }
  } catch (err) {
    console.error("deletePlayer failed:", err);
    throw err;
  }
}
