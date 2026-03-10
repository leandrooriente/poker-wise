import { generateId } from "@/lib/uuid";
import { getUser } from "@/db/users";
import { Match } from "@/types/match";
import { ensureMigration } from "./migrate";

const STORAGE_KEY = "poker-wise-matches";

export async function getMatches(): Promise<Match[]> {
  await ensureMigration();
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load matches:", error);
    return [];
  }
}

export async function saveMatches(matches: Match[]): Promise<void> {
  await ensureMigration();
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  } catch (error) {
    console.error("Failed to save matches:", error);
  }
}

export async function addMatch(match: Omit<Match, "id" | "createdAt">): Promise<Match> {
  await ensureMigration();
  const newMatch: Match = {
    ...match,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  const matches = await getMatches();
  matches.push(newMatch);
  await saveMatches(matches);
  return newMatch;
}

export async function updateMatch(updatedMatch: Match): Promise<void> {
  await ensureMigration();
  const matches = await getMatches();
  const index = matches.findIndex((m) => m.id === updatedMatch.id);
  if (index >= 0) {
    matches[index] = updatedMatch;
    await saveMatches(matches);
  }
}

export async function deleteMatch(id: string): Promise<void> {
  await ensureMigration();
  const matches = await getMatches();
  const filtered = matches.filter((m) => m.id !== id);
  await saveMatches(filtered);
}

export async function getMatch(id: string): Promise<Match | undefined> {
  await ensureMigration();
  const matches = await getMatches();
  return matches.find((m) => m.id === id);
}

export async function getMatchesByGroup(groupId: string): Promise<Match[]> {
  await ensureMigration();
  const matches = await getMatches();
  return matches.filter(m => m.groupId === groupId);
}

export async function deleteMatchesByGroup(groupId: string): Promise<void> {
  await ensureMigration();
  const matches = await getMatches();
  const filtered = matches.filter(m => m.groupId !== groupId);
  await saveMatches(filtered);
}

export async function getMatchWithUsers(id: string): Promise<{
  match: Match;
  players: Array<{
    user: any; // TODO: replace with User type when we have it imported
    buyIns: number;
    finalValue: number;
  }>;
} | null> {
  await ensureMigration();
  const match = await getMatch(id);
  if (!match) return null;
  console.log('[getMatchWithUsers] match:', match.id, 'players:', match.players);
  const playerDetails = await Promise.all(
    match.players.map(async (mp) => {
      const user = await getUser(mp.userId);
      console.log('[getMatchWithUsers] userId:', mp.userId, 'user:', user);
      return {
        user: user!,
        buyIns: mp.buyIns,
        finalValue: mp.finalValue,
      };
    })
  );
  const filtered = playerDetails.filter(p => p.user);
  console.log('[getMatchWithUsers] filtered players:', filtered.length);
  return { match, players: filtered };
}