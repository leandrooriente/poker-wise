import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "@/server/db";
import { admins, groups, groupAdmins, players, matches, matchEntries, groupShareTokens } from "@/server/db/schema";

export async function createAdmin(email: string, password: string) {
  const passwordHash = await hash(password, 10);
  const [admin] = await db
    .insert(admins)
    .values({ email, passwordHash })
    .returning();
  return admin;
}

export async function createGroup(name: string, slug: string, createdByAdminId: string) {
  const [group] = await db
    .insert(groups)
    .values({ name, slug, createdByAdminId })
    .returning();
  return group;
}

export async function addGroupAdmin(groupId: string, adminId: string, role = "admin") {
  const [groupAdmin] = await db
    .insert(groupAdmins)
    .values({ groupId, adminId, role })
    .returning();
  return groupAdmin;
}

export async function createPlayer(groupId: string, name: string, notes?: string) {
  const [player] = await db
    .insert(players)
    .values({ groupId, name, notes })
    .returning();
  return player;
}

export async function createMatch(
  groupId: string,
  createdByAdminId: string,
  options?: { title?: string; buyInAmount?: number; status?: "live" | "settled"; startedAt?: Date; endedAt?: Date }
) {
  const [match] = await db
    .insert(matches)
    .values({
      groupId,
      createdByAdminId,
      title: options?.title,
      buyInAmount: options?.buyInAmount ?? 1000,
      status: options?.status ?? "live",
      startedAt: options?.startedAt ?? new Date(),
      endedAt: options?.endedAt,
    })
    .returning();
  return match;
}

export async function createMatchEntry(matchId: string, playerId: string, buyIns = 1, finalValue = 0) {
  const [entry] = await db
    .insert(matchEntries)
    .values({ matchId, playerId, buyIns, finalValue })
    .returning();
  return entry;
}

export async function createShareToken(groupId: string, token?: string) {
  const rawToken = token ?? randomUUID();
  const tokenHash = await hash(rawToken, 10);
  const [shareToken] = await db
    .insert(groupShareTokens)
    .values({ groupId, tokenHash })
    .returning();
  return { shareToken, rawToken };
}