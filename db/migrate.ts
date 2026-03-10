import { User } from "@/types/user";
import { Group } from "@/types/group";
import { GroupMember } from "@/types/group";
import { Match, MatchPlayer } from "@/types/match";
import { getUsers, saveUsers } from "./users";
import { getGroups, saveGroups, addGroup } from "./groups";
import { getGroupMembers, saveGroupMembers } from "./members";
import { getMatches, saveMatches } from "./matches";

export let isMigrating = false;

const LEGACY_PLAYERS_KEY = "poker-wise-players";
const LEGACY_MATCHES_KEY = "poker-wise-matches";
const LEGACY_SETTINGS_KEY = "poker-wise-settings";
const MIGRATION_MARKER_KEY = "poker-wise-migration-v1-done";

export async function runMigrationIfNeeded(): Promise<void> {
  if (typeof window === "undefined") return;
  const marker = localStorage.getItem(MIGRATION_MARKER_KEY);
  console.log("[Migration] marker:", marker);
  if (marker === "true") {
    console.log("[Migration] already migrated, skipping");
    return; // Already migrated
  }

  const legacyPlayers = getLegacyPlayers();
  const legacyMatches = getLegacyMatches();
  console.log("[Migration] legacy players:", legacyPlayers.length, "legacy matches:", legacyMatches.length);
  
  // If there's no legacy data, just mark migration as done
  if (legacyPlayers.length === 0 && legacyMatches.length === 0) {
    console.log("[Migration] no legacy data, marking done");
    localStorage.setItem(MIGRATION_MARKER_KEY, "true");
    return;
  }

  console.log("[Migration] Migrating legacy data to new group-based model...");

  isMigrating = true;
  try {
    // Step 1: Create default group "home-game"
    const groups = await getGroups();
    let defaultGroup = groups.find(g => g.id === "home-game");
    if (!defaultGroup) {
      defaultGroup = await addGroup({ id: "home-game", name: "Home Game" });
    }

    // Step 2: Migrate legacy players to global users
    const existingUsers = await getUsers();
    const userMap = new Map<string, User>(); // old player id -> new user
    for (const player of legacyPlayers) {
      // Create user without notes and preferredBuyIn
      const newUser: User = {
        id: player.id, // keep same id for simplicity (they are UUIDs)
        name: player.name,
        createdAt: player.createdAt,
      };
      existingUsers.push(newUser);
      userMap.set(player.id, newUser);
    }
    await saveUsers(existingUsers);

    // Step 3: Create group memberships for all migrated users
    const members = await getGroupMembers();
    for (const user of Array.from(userMap.values())) {
      if (!members.some(m => m.groupId === defaultGroup.id && m.userId === user.id)) {
        members.push({
          groupId: defaultGroup.id,
          userId: user.id,
          joinedAt: new Date().toISOString(),
        });
      }
    }
    await saveGroupMembers(members);

    // Step 4: Migrate matches
    const existingMatches = await getMatches();
    for (const match of legacyMatches) {
      // Skip matches that already have groupId (already migrated)
      if (match.groupId) {
        continue;
      }
      // Add groupId and convert playerId to userId
      const migratedMatch: Match = {
        ...match,
        groupId: defaultGroup.id,
        players: match.players.map((mp: any): MatchPlayer => ({
          userId: mp.userId || mp.playerId, // prefer userId if already present
          buyIns: mp.buyIns,
          finalValue: mp.finalValue,
        })),
      };
      existingMatches.push(migratedMatch);
    }
    await saveMatches(existingMatches);

    // Step 5: Optionally delete legacy data (keep for safety)
    // localStorage.removeItem(LEGACY_PLAYERS_KEY);
    // localStorage.removeItem(LEGACY_MATCHES_KEY);
    // localStorage.removeItem(LEGACY_SETTINGS_KEY);

    // Mark migration complete
    localStorage.setItem(MIGRATION_MARKER_KEY, "true");
    console.log("Migration completed successfully.");
  } finally {
    isMigrating = false;
  }
}

function getLegacyPlayers(): any[] {
  try {
    const data = localStorage.getItem(LEGACY_PLAYERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function getLegacyMatches(): any[] {
  try {
    const data = localStorage.getItem(LEGACY_MATCHES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

let migrationPromise: Promise<void> | null = null;

export function ensureMigration(): Promise<void> {
  console.log("[Migration] ensureMigration called, isMigrating:", isMigrating);
  if (isMigrating) {
    // Migration is already in progress; don't block
    console.log("[Migration] migration already in progress, returning resolved promise");
    return Promise.resolve();
  }
  // If migration marker is not set, we need to run migration regardless of cached promise
  // This handles the case where localStorage was cleared after a previous migration
  if (typeof window !== "undefined") {
    const marker = localStorage.getItem(MIGRATION_MARKER_KEY);
    console.log("[Migration] marker check:", marker);
    if (marker !== "true") {
      console.log("[Migration] marker not set, resetting migrationPromise");
      migrationPromise = null;
    }
  }
  if (!migrationPromise) {
    console.log("[Migration] migrationPromise is null, calling runMigrationIfNeeded");
    migrationPromise = runMigrationIfNeeded();
  } else {
    console.log("[Migration] migrationPromise already exists");
  }
  return migrationPromise;
}