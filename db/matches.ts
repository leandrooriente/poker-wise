import { SettlementResult } from "../lib/settlement";
import { Match } from "../types/match";



function normalizeMatch(match: any): Match {
  return {
    ...match,
    title: match.title ?? undefined,
    endedAt: match.endedAt ?? undefined,
    settlement: match.settlement,
  };
}





export async function addMatch(
  match: Omit<Match, "id" | "createdAt">
): Promise<Match> {
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
}

export async function updateMatch(updatedMatch: Match): Promise<void> {
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
}



export async function getMatchesByGroup(groupId: string): Promise<Match[]> {
  const res = await fetch(`/api/admin/groups/${groupId}/matches`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch matches: ${res.status}`);
  }

  const data = await res.json();
  return data.map((match: any) => normalizeMatch(match));
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
  const res = await fetch(`/api/admin/matches/${id}`, {
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 404) {
      // Match not found
      return null;
    }
    throw new Error(`Failed to fetch match: ${res.status}`);
  }

  const data = await res.json();
  return {
    match: normalizeMatch(data.match),
    players: data.players,
    settlement: data.settlement,
  };
}

export async function settleMatch(
  id: string,
  finalValues: Record<string, number>
): Promise<{
  match: Match;
  players: Array<{ user: any; buyIns: number; finalValue: number }>;
  settlement: SettlementResult;
}> {
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
}
