import { createHash, randomBytes } from "node:crypto";

import { compare } from "bcryptjs";
import { and, desc, eq, isNull } from "drizzle-orm";

import { buildScoreRows, type ScoreRow } from "@/lib/score";
import { calculateSettlement, type SettlementResult } from "@/lib/settlement";
import { getDb } from "@/server/db";
import {
  groupAdmins,
  groupShareTokens,
  groups,
  matchEntries,
  matches,
  players,
} from "@/server/db/schema";
import type { Match, MatchPlayer, MatchStatus } from "@/types/match";
import type { Player } from "@/types/player";

const TOKEN_HASH_PREFIX = "sha256:";
const SHARE_TOKEN_BYTES = 32;

export interface ShareTokenLookupRecord {
  tokenHash: string;
  revokedAt: Date | null;
}

export interface PublicSharePlayer {
  id: string;
  name: string;
  createdAt: Date;
}

export interface PublicShareMatchPlayer {
  playerId: string;
  playerName: string;
  buyIns: number;
  finalValue: number;
  cashedOutAt: Date | null;
}

export interface PublicShareMatch {
  id: string;
  title: string | null;
  buyInAmount: number;
  status: MatchStatus;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  players: PublicShareMatchPlayer[];
  settlement?: SettlementResult;
}

export interface PublicGroupShareData {
  group: {
    name: string;
    slug: string;
  };
  players: PublicSharePlayer[];
  liveMatch: PublicShareMatch | null;
  settledMatches: PublicShareMatch[];
  scoreboard: ScoreRow[];
}

export function generateRawShareToken() {
  return randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
}

export function hashShareToken(rawToken: string) {
  return `${TOKEN_HASH_PREFIX}${createHash("sha256")
    .update(rawToken, "utf8")
    .digest("hex")}`;
}

function isLegacyBcryptTokenHash(tokenHash: string) {
  return /^\$2[aby]\$/.test(tokenHash);
}

/**
 * Finds a matching, non-revoked token record. Supports new deterministic
 * SHA-256 token hashes and legacy bcrypt hashes produced by older seed scripts.
 */
export async function findMatchingShareTokenRecord<
  T extends ShareTokenLookupRecord,
>(rawToken: string, tokenRecords: T[]): Promise<T | undefined> {
  const normalizedToken = rawToken.trim();
  if (!normalizedToken) {
    return undefined;
  }

  const activeTokens = tokenRecords.filter((token) => token.revokedAt === null);
  const expectedHash = hashShareToken(normalizedToken);
  const shaMatch = activeTokens.find(
    (token) => token.tokenHash === expectedHash
  );

  if (shaMatch) {
    return shaMatch;
  }

  for (const token of activeTokens) {
    if (!isLegacyBcryptTokenHash(token.tokenHash)) {
      continue;
    }

    try {
      if (await compare(normalizedToken, token.tokenHash)) {
        return token;
      }
    } catch {
      // Ignore malformed legacy hashes and continue looking for a match.
    }
  }

  return undefined;
}

async function verifyAdminCanManageGroup(groupId: string, adminId: string) {
  const db = getDb();
  const membership = await db.query.groupAdmins.findFirst({
    where: and(
      eq(groupAdmins.groupId, groupId),
      eq(groupAdmins.adminId, adminId),
      eq(groupAdmins.role, "admin")
    ),
  });

  return Boolean(membership);
}

export async function createGroupShareTokenForAdmin(
  groupId: string,
  adminId: string
): Promise<
  | {
      tokenId: string;
      rawToken: string;
      createdAt: Date;
    }
  | undefined
> {
  if (!(await verifyAdminCanManageGroup(groupId, adminId))) {
    return undefined;
  }

  const rawToken = generateRawShareToken();
  const tokenHash = hashShareToken(rawToken);
  const db = getDb();

  const [shareToken] = await db
    .insert(groupShareTokens)
    .values({ groupId, tokenHash })
    .returning({
      id: groupShareTokens.id,
      createdAt: groupShareTokens.createdAt,
    });

  return {
    tokenId: shareToken.id,
    rawToken,
    createdAt: shareToken.createdAt,
  };
}

export async function revokeGroupShareTokenForAdmin(
  tokenId: string,
  adminId: string
): Promise<boolean> {
  const db = getDb();
  const shareToken = await db.query.groupShareTokens.findFirst({
    where: eq(groupShareTokens.id, tokenId),
  });

  if (!shareToken) {
    return false;
  }

  if (!(await verifyAdminCanManageGroup(shareToken.groupId, adminId))) {
    return false;
  }

  const [revoked] = await db
    .update(groupShareTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(groupShareTokens.id, tokenId), isNull(groupShareTokens.revokedAt))
    )
    .returning({ id: groupShareTokens.id });

  return Boolean(revoked);
}

async function getGroupIdForShareToken(rawToken: string) {
  const db = getDb();
  const normalizedToken = rawToken.trim();
  if (!normalizedToken) {
    return undefined;
  }

  const tokenHash = hashShareToken(normalizedToken);
  const directToken = await db.query.groupShareTokens.findFirst({
    where: and(
      eq(groupShareTokens.tokenHash, tokenHash),
      isNull(groupShareTokens.revokedAt)
    ),
  });

  if (directToken) {
    return directToken.groupId;
  }

  // Legacy bcrypt hashes cannot be looked up deterministically, so scan only
  // active tokens when a deterministic lookup did not match.
  const activeTokens = await db
    .select({
      id: groupShareTokens.id,
      groupId: groupShareTokens.groupId,
      tokenHash: groupShareTokens.tokenHash,
      revokedAt: groupShareTokens.revokedAt,
    })
    .from(groupShareTokens)
    .where(isNull(groupShareTokens.revokedAt));

  const matchedToken = await findMatchingShareTokenRecord(
    normalizedToken,
    activeTokens
  );

  return matchedToken?.groupId;
}

function normalizeMatchStatus(status: string): MatchStatus {
  return status === "settled" ? "settled" : "live";
}

function toMatchPlayer(player: PublicShareMatchPlayer): MatchPlayer {
  return {
    userId: player.playerId,
    buyIns: player.buyIns,
    finalValue: player.finalValue,
    cashedOutAt: player.cashedOutAt,
  };
}

function toScoreMatch(match: PublicShareMatch, groupSlug: string): Match {
  return {
    id: match.id,
    groupId: groupSlug,
    title: match.title ?? undefined,
    status: match.status,
    createdAt: match.createdAt.toISOString(),
    startedAt: match.startedAt.toISOString(),
    endedAt: match.endedAt?.toISOString(),
    buyInAmount: match.buyInAmount,
    players: match.players.map(toMatchPlayer),
    settlement: match.settlement,
  };
}

function toScorePlayer(player: PublicSharePlayer): Player {
  return {
    id: player.id,
    name: player.name,
    createdAt: player.createdAt.toISOString(),
  };
}

async function listPublicMatchesForGroup(groupId: string) {
  const db = getDb();
  const matchRows = await db
    .select()
    .from(matches)
    .where(eq(matches.groupId, groupId))
    .orderBy(desc(matches.createdAt));

  if (matchRows.length === 0) {
    return [];
  }

  const entries = await db
    .select({
      matchId: matchEntries.matchId,
      playerId: matchEntries.playerId,
      playerName: players.name,
      buyIns: matchEntries.buyIns,
      finalValue: matchEntries.finalValue,
      cashedOutAt: matchEntries.cashedOutAt,
    })
    .from(matchEntries)
    .innerJoin(matches, eq(matchEntries.matchId, matches.id))
    .innerJoin(players, eq(matchEntries.playerId, players.id))
    .where(and(eq(matches.groupId, groupId), eq(players.groupId, groupId)));

  const entriesByMatchId = new Map<string, typeof entries>();
  for (const entry of entries) {
    const existing = entriesByMatchId.get(entry.matchId) ?? [];
    existing.push(entry);
    entriesByMatchId.set(entry.matchId, existing);
  }

  return matchRows.map((match): PublicShareMatch => {
    const matchPlayers = (entriesByMatchId.get(match.id) ?? []).map(
      (entry): PublicShareMatchPlayer => ({
        playerId: entry.playerId,
        playerName: entry.playerName,
        buyIns: entry.buyIns,
        finalValue: entry.finalValue,
        cashedOutAt: entry.cashedOutAt,
      })
    );

    const status = normalizeMatchStatus(match.status);
    const publicMatch: PublicShareMatch = {
      id: match.id,
      title: match.title,
      buyInAmount: match.buyInAmount,
      status,
      startedAt: match.startedAt,
      endedAt: match.endedAt,
      createdAt: match.createdAt,
      players: matchPlayers,
    };

    if (status === "settled") {
      publicMatch.settlement = calculateSettlement(
        matchPlayers.map(toMatchPlayer),
        match.buyInAmount
      );
    }

    return publicMatch;
  });
}

export async function getPublicGroupShareDataByToken(
  rawToken: string
): Promise<PublicGroupShareData | null> {
  const groupId = await getGroupIdForShareToken(rawToken);
  if (!groupId) {
    return null;
  }

  const db = getDb();
  const [group] = await db
    .select({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
    })
    .from(groups)
    .where(eq(groups.id, groupId));

  if (!group) {
    return null;
  }

  const publicPlayers = await db
    .select({
      id: players.id,
      name: players.name,
      createdAt: players.createdAt,
    })
    .from(players)
    .where(eq(players.groupId, group.id))
    .orderBy(desc(players.createdAt));

  const publicMatches = await listPublicMatchesForGroup(group.id);
  const liveMatch =
    publicMatches.find((match) => match.status === "live") ?? null;
  const settledMatches = publicMatches.filter(
    (match) => match.status === "settled"
  );
  const scoreboard = buildScoreRows(
    publicMatches.map((match) => toScoreMatch(match, group.slug)),
    publicPlayers.map(toScorePlayer)
  );

  return {
    group: {
      name: group.name,
      slug: group.slug,
    },
    players: publicPlayers,
    liveMatch,
    settledMatches,
    scoreboard,
  };
}
