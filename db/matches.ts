import { getPlayers } from "@/db/players";
import { Match } from "@/types/match";
import { Player } from "@/types/player";
import { generateId } from "@/lib/uuid";

const STORAGE_KEY = "poker-wise-matches";

export async function getMatches(): Promise<Match[]> {
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
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  } catch (error) {
    console.error("Failed to save matches:", error);
  }
}

export async function addMatch(match: Omit<Match, "id" | "createdAt">): Promise<Match> {
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
  const matches = await getMatches();
  const index = matches.findIndex((m) => m.id === updatedMatch.id);
  if (index >= 0) {
    matches[index] = updatedMatch;
    await saveMatches(matches);
  }
}

export async function deleteMatch(id: string): Promise<void> {
  const matches = await getMatches();
  const filtered = matches.filter((m) => m.id !== id);
  await saveMatches(filtered);
}

export async function getMatch(id: string): Promise<Match | undefined> {
  const matches = await getMatches();
  return matches.find((m) => m.id === id);
}

export async function getMatchWithPlayers(id: string): Promise<{
  match: Match;
  players: Array<{
    player: Player;
    buyIns: number;
    finalValue: number;
  }>;
} | null> {
  const match = await getMatch(id);
  if (!match) return null;
  const playerList = await getPlayers();
  const players = match.players.map((mp) => {
    const player = playerList.find((p) => p.id === mp.playerId);
    return {
      player: player!,
      buyIns: mp.buyIns,
      finalValue: mp.finalValue,
    };
  }).filter((p) => p.player);
  return { match, players };
}