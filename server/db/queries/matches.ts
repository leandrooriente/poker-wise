import { and, desc, eq, inArray } from "drizzle-orm";
import { generateId } from "@/lib/uuid";

import { db } from "@/server/db";
import {
  groupAdmins,
  matchEntries,
  matches,
  players,
} from "@/server/db/schema";
import { calculateSettlement, SettlementResult } from "@/lib/settlement";

export interface MatchEntryInput {
  userId: string;
  buyIns: number;
  finalValue: number;
}

export interface MatchRecord {
  id: string;
  groupId: string;
  title: string | null;
  buyInAmount: number;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  createdByAdminId: string;
  createdAt: Date;
  players: MatchEntryInput[];
  settlement?: SettlementResult;
}

export interface MatchPlayerDetails {
  user: {
    id: string;
    name: string;
    notes: string | null;
    createdAt: Date;
  };
  buyIns: number;
  finalValue: number;
}

function buildSettlement(match: MatchRecord): SettlementResult {
  return calculateSettlement(match.players, match.buyInAmount);
}

async function verifyAdminMembership(groupId: string, adminId: string) {
  const membership = await db.query.groupAdmins.findFirst({
    where: and(
      eq(groupAdmins.groupId, groupId),
      eq(groupAdmins.adminId, adminId)
    ),
  });

  return !!membership;
}

async function getPlayerRows(groupId: string, playerIds: string[]) {
  if (playerIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: players.id,
      name: players.name,
      notes: players.notes,
      createdAt: players.createdAt,
    })
    .from(players)
    .where(and(eq(players.groupId, groupId), inArray(players.id, playerIds)));
}

async function getMatchBase(matchId: string) {
  return db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
}

async function buildMatchRecord(
  matchRow: typeof matches.$inferSelect
): Promise<MatchRecord> {
  const entries = await db
    .select({
      userId: matchEntries.playerId,
      buyIns: matchEntries.buyIns,
      finalValue: matchEntries.finalValue,
    })
    .from(matchEntries)
    .where(eq(matchEntries.matchId, matchRow.id));

  const record: MatchRecord = {
    ...matchRow,
    players: entries,
  };

  // Include settlement for settled matches
  if (matchRow.status === "settled") {
    record.settlement = buildSettlement(record);
  }

  return record;
}

export async function createMatchForAdmin(
  input: {
    groupId: string;
    title?: string;
    buyInAmount: number;
    players: MatchEntryInput[];
    startedAt?: string;
    createdAt?: string;
    endedAt?: string;
    status?: string;
  },
  adminId: string
): Promise<MatchRecord | undefined> {
  if (!(await verifyAdminMembership(input.groupId, adminId))) {
    return undefined;
  }

  const playerIds = input.players.map((player) => player.userId);
  const playerRows = await getPlayerRows(input.groupId, playerIds);

  if (playerRows.length !== playerIds.length) {
    return undefined;
  }

  const matchId = generateId();

  await db.transaction(async (tx: any) => {
    await tx.insert(matches).values({
      id: matchId,
      groupId: input.groupId,
      title: input.title,
      buyInAmount: input.buyInAmount,
      status: input.status ?? "live",
      startedAt: input.startedAt ? new Date(input.startedAt) : new Date(),
      createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
      endedAt: input.endedAt ? new Date(input.endedAt) : null,
      createdByAdminId: adminId,
    });

    await tx.insert(matchEntries).values(
      input.players.map((player) => ({
        id: generateId(),
        matchId,
        playerId: player.userId,
        buyIns: player.buyIns,
        finalValue: player.finalValue,
      }))
    );
  });

  const created = await getMatchBase(matchId);
  if (!created) {
    return undefined;
  }

  return buildMatchRecord(created);
}

export async function getMatchForAdmin(
  matchId: string,
  adminId: string
): Promise<MatchRecord | undefined> {
  const matchRow = await getMatchBase(matchId);
  if (!matchRow) {
    return undefined;
  }

  if (!(await verifyAdminMembership(matchRow.groupId, adminId))) {
    return undefined;
  }

  return buildMatchRecord(matchRow);
}

export async function getMatchWithPlayersForAdmin(
  matchId: string,
  adminId: string
): Promise<
  | {
      match: MatchRecord;
      players: MatchPlayerDetails[];
      settlement?: SettlementResult;
    }
  | undefined
> {
  const match = await getMatchForAdmin(matchId, adminId);
  if (!match) {
    return undefined;
  }

  const playerRows = await getPlayerRows(
    match.groupId,
    match.players.map((player) => player.userId)
  );
  const playersById = new Map(
    playerRows.map((player: (typeof playerRows)[number]) => [player.id, player])
  );

  const details = match.players
    .map((entry) => {
      const player = playersById.get(entry.userId);
      if (!player) {
        return null;
      }

      return {
        user: player,
        buyIns: entry.buyIns,
        finalValue: entry.finalValue,
      };
    })
    .filter((entry): entry is MatchPlayerDetails => entry !== null);

  return {
    match,
    players: details,
    settlement: match.status === "settled" ? buildSettlement(match) : undefined,
  };
}

export async function listMatchesForGroupForAdmin(
  groupId: string,
  adminId: string
): Promise<MatchRecord[]> {
  if (!(await verifyAdminMembership(groupId, adminId))) {
    return [];
  }

  const rows = await db
    .select()
    .from(matches)
    .where(eq(matches.groupId, groupId))
    .orderBy(desc(matches.createdAt));

  return Promise.all(
    rows.map((row: typeof matches.$inferSelect) => buildMatchRecord(row))
  );
}

export async function updateMatchForAdmin(
  matchId: string,
  adminId: string,
  updates: {
    title?: string | null;
    buyInAmount?: number;
    players?: MatchEntryInput[];
    startedAt?: string;
    endedAt?: string | null;
    status?: string;
  }
): Promise<MatchRecord | undefined> {
  const existing = await getMatchBase(matchId);
  if (!existing) {
    return undefined;
  }

  if (!(await verifyAdminMembership(existing.groupId, adminId))) {
    return undefined;
  }

  if (updates.players) {
    const playerRows = await getPlayerRows(
      existing.groupId,
      updates.players.map((player) => player.userId)
    );

    if (playerRows.length !== updates.players.length) {
      return undefined;
    }
  }

  await db.transaction(async (tx: any) => {
    await tx
      .update(matches)
      .set({
        ...(updates.title !== undefined ? { title: updates.title } : {}),
        ...(updates.buyInAmount !== undefined
          ? { buyInAmount: updates.buyInAmount }
          : {}),
        ...(updates.startedAt !== undefined
          ? { startedAt: new Date(updates.startedAt) }
          : {}),
        ...(updates.endedAt !== undefined
          ? { endedAt: updates.endedAt ? new Date(updates.endedAt) : null }
          : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
      })
      .where(eq(matches.id, matchId));

    if (updates.players) {
      await tx.delete(matchEntries).where(eq(matchEntries.matchId, matchId));
      await tx.insert(matchEntries).values(
        updates.players.map((player) => ({
          id: generateId(),
          matchId,
          playerId: player.userId,
          buyIns: player.buyIns,
          finalValue: player.finalValue,
        }))
      );
    }
  });

  const updated = await getMatchBase(matchId);
  if (!updated) {
    return undefined;
  }

  return buildMatchRecord(updated);
}

export async function settleMatchForAdmin(
  matchId: string,
  adminId: string,
  finalValues: Record<string, number>
): Promise<
  | {
      match: MatchRecord;
      players: MatchPlayerDetails[];
      settlement: SettlementResult;
    }
  | { error: string }
  | undefined
> {
  const existing = await getMatchForAdmin(matchId, adminId);
  if (!existing) {
    return undefined;
  }

  const settledPlayers = existing.players.map((player) => ({
    ...player,
    finalValue: finalValues[player.userId] ?? 0,
  }));
  const settlement = calculateSettlement(settledPlayers, existing.buyInAmount);

  if (!settlement.isValid) {
    return { error: settlement.error || "Totals do not match" };
  }

  const updated = await updateMatchForAdmin(matchId, adminId, {
    players: settledPlayers,
    endedAt: existing.endedAt?.toISOString() ?? new Date().toISOString(),
    status: "settled",
  });

  if (!updated) {
    return undefined;
  }

  const result = await getMatchWithPlayersForAdmin(matchId, adminId);
  if (!result) {
    return undefined;
  }

  return {
    match: result.match,
    players: result.players,
    settlement: result.settlement ?? buildSettlement(result.match),
  };
}

export async function deleteMatchForAdmin(
  matchId: string,
  adminId: string
): Promise<boolean> {
  const matchRow = await getMatchBase(matchId);
  if (!matchRow) {
    return false;
  }

  if (!(await verifyAdminMembership(matchRow.groupId, adminId))) {
    return false;
  }

  await db.delete(matches).where(eq(matches.id, matchId));
  return true;
}
