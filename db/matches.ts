import { getPlayersForGroup } from "./players";

import { generateId } from "../lib/uuid";
import { calculateSettlement, SettlementResult } from "../lib/settlement";
import { Match } from "../types/match";

const STORAGE_KEY = "poker-wise-matches";

function normalizeMatch(match: any): Match {
  return {
    ...match,
    title: match.title ?? undefined,
    endedAt: match.endedAt ?? undefined,
  };
}

async function getLocalMatches(): Promise<Match[]> {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const matches = data ? JSON.parse(data) : [];
    return matches.map((match: any) => normalizeMatch(match));
  } catch {
    return [];
  }
}

async function saveLocalMatches(matches: Match[]): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  } catch {
    // Failed to save matches
  }
}

export async function getMatches(): Promise<Match[]> {
  return getLocalMatches();
}

export async function saveMatches(matches: Match[]): Promise<void> {
  await saveLocalMatches(matches);
}

export async function addMatch(
  match: Omit<Match, "id" | "createdAt">
): Promise<Match> {
  try {
    const res = await fetch(`/api/admin/groups/${match.groupId}/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: match.title,
        buyInAmount: match.buyInAmount,
        players: match.players,
        startedAt: match.startedAt,
        endedAt: match.endedAt,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to create match: ${res.status}`);
    }

    return normalizeMatch(await res.json());
  } catch (err) {
    const localMatch: Match = {
      ...match,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const matches = await getLocalMatches();
    matches.push(localMatch);
    await saveLocalMatches(matches);
    return localMatch;
  }
}

export async function updateMatch(updatedMatch: Match): Promise<void> {
  try {
    const res = await fetch(`/api/admin/matches/${updatedMatch.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        groupId: updatedMatch.groupId,
        title: updatedMatch.title,
        buyInAmount: updatedMatch.buyInAmount,
        players: updatedMatch.players,
        createdAt: updatedMatch.createdAt,
        startedAt: updatedMatch.startedAt,
        endedAt: updatedMatch.endedAt,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to update match: ${res.status}`);
    }
    return;
  } catch {
    const matches = await getLocalMatches();
    const index = matches.findIndex((match) => match.id === updatedMatch.id);
    if (index >= 0) {
      matches[index] = updatedMatch;
      await saveLocalMatches(matches);
    }
  }
}

export async function deleteMatch(id: string): Promise<void> {
  const matches = await getLocalMatches();
  await saveLocalMatches(matches.filter((match) => match.id !== id));
}

export async function getMatch(id: string): Promise<Match | undefined> {
  const matches = await getLocalMatches();
  return matches.find((match) => match.id === id);
}

export async function getMatchesByGroup(groupId: string): Promise<Match[]> {
  try {
    const res = await fetch(`/api/admin/groups/${groupId}/matches`, {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch matches: ${res.status}`);
    }

    const data = await res.json();
    return data.map((match: any) => normalizeMatch(match));
  } catch {
    const matches = await getLocalMatches();
    return matches.filter((match) => match.groupId === groupId);
  }
}

export async function deleteMatchesByGroup(groupId: string): Promise<void> {
  const matches = await getLocalMatches();
  await saveLocalMatches(matches.filter((match) => match.groupId !== groupId));
}

export async function getMatchWithUsers(id: string): Promise<{
  match: Match;
  players: Array<{
    user: any;
    buyIns: number;
    finalValue: number;
  }>;
  settlement?: SettlementResult;
} | null> {
  try {
    const res = await fetch(`/api/admin/matches/${id}`, {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch match: ${res.status}`);
    }

    const data = await res.json();
    return {
      match: normalizeMatch(data.match),
      players: data.players,
      settlement: data.settlement,
    };
  } catch (err) {
    console.warn(
      "getMatchWithUsers API call failed, falling back to local match",
      err
    );
    const match = await getMatch(id);
    if (!match) {
      console.warn("local match not found for id:", id);
      return null;
    }
    console.warn("local match groupId:", match.groupId);
    const playersForGroup = await getPlayersForGroup(match.groupId);
    console.warn("playersForGroup length:", playersForGroup.length);
    console.warn(
      "playersForGroup:",
      playersForGroup.map((p) => ({ id: p.id, name: p.name }))
    );
    const playersById = new Map(
      playersForGroup.map((player) => [player.id, player])
    );
    console.warn("match.players:", match.players);

    const playersResult = match.players
      .map((entry) => {
        const user = playersById.get(entry.userId);
        if (!user) {
          console.warn("no user found for userId:", entry.userId);
          return null;
        }

        return {
          user,
          buyIns: entry.buyIns,
          finalValue: entry.finalValue,
        };
      })
      .filter(
        (entry): entry is { user: any; buyIns: number; finalValue: number } =>
          entry !== null
      );
    console.warn(
      "playersResult:",
      playersResult.map((p) => ({
        userId: p.user.id,
        name: p.user.name,
        buyIns: p.buyIns,
        finalValue: p.finalValue,
      }))
    );

    return {
      match,
      players: playersResult,
      settlement:
        match.status === "settled"
          ? calculateSettlement(match.players, match.buyInAmount)
          : undefined,
    };
  }
}

export async function settleMatch(
  id: string,
  finalValues: Record<string, number>
): Promise<{
  match: Match;
  players: Array<{ user: any; buyIns: number; finalValue: number }>;
  settlement: SettlementResult;
}> {
  try {
    const res = await fetch(`/api/admin/matches/${id}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ finalValues }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || `Failed to settle match: ${res.status}`);
    }

    const data = await res.json();
    return {
      match: normalizeMatch(data.match),
      players: data.players,
      settlement: data.settlement,
    };
  } catch {
    const match = await getMatch(id);
    if (!match) {
      throw new Error("Match not found");
    }

    const updatedMatch = {
      ...match,
      status: "settled" as const,
      endedAt: match.endedAt || new Date().toISOString(),
      players: match.players.map((player) => ({
        ...player,
        finalValue: finalValues[player.userId] ?? 0,
      })),
    };
    await updateMatch(updatedMatch);

    const data = await getMatchWithUsers(id);
    if (!data || !data.settlement) {
      throw new Error("Failed to settle match");
    }

    return {
      match: data.match,
      players: data.players,
      settlement: data.settlement,
    };
  }
}
