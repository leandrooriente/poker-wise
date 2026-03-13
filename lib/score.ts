import { calculateSettlement } from "@/lib/settlement";
import { Match } from "@/types/match";
import { Player } from "@/types/player";

export interface ScoreRow {
  id: string;
  name: string;
  totalNet: number;
  averageNet: number;
  matchCount: number;
}

export type ScoreMode = "total" | "average";

function compareNames(a: string, b: string) {
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

export function buildScoreRows(matches: Match[], players: Player[]): ScoreRow[] {
  const playerNames = new Map(players.map((player) => [player.id, player.name]));
  const aggregates = new Map<
    string,
    { id: string; name: string; totalNet: number; matchCount: number }
  >();

  for (const match of matches) {
    if (match.status !== "settled") {
      continue;
    }

    const settlement =
      match.settlement ?? calculateSettlement(match.players, match.buyInAmount);

    for (const balance of settlement.playerBalances) {
      const existing = aggregates.get(balance.userId);
      const name = playerNames.get(balance.userId) ?? "Unknown";

      if (existing) {
        existing.totalNet += balance.net;
        existing.matchCount += 1;
        continue;
      }

      aggregates.set(balance.userId, {
        id: balance.userId,
        name,
        totalNet: balance.net,
        matchCount: 1,
      });
    }
  }

  return [...aggregates.values()]
    .map((row) => ({
      ...row,
      averageNet: row.totalNet / row.matchCount,
    }))
    .sort((a, b) => {
      if (b.totalNet !== a.totalNet) {
        return b.totalNet - a.totalNet;
      }
      return compareNames(a.name, b.name);
    });
}

export function sortScoreRows(rows: ScoreRow[], mode: ScoreMode): ScoreRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const valueA = mode === "total" ? a.totalNet : a.averageNet;
    const valueB = mode === "total" ? b.totalNet : b.averageNet;

    if (valueB !== valueA) {
      return valueB - valueA;
    }

    if (b.matchCount !== a.matchCount) {
      return a.matchCount - b.matchCount;
    }

    return compareNames(a.name, b.name);
  });
  return sorted;
}
