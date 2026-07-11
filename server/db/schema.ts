import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { generateId } from "@/lib/uuid";

const timestampMs = (name: string) => integer(name, { mode: "timestamp_ms" });

export const admins = sqliteTable("admins", {
  id: text("id").primaryKey().$defaultFn(generateId),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestampMs("created_at")
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const groups = sqliteTable(
  "groups",
  {
    id: text("id").primaryKey().$defaultFn(generateId),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    createdByAdminId: text("created_by_admin_id")
      .notNull()
      .references(() => admins.id),
    createdAt: timestampMs("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("groups_created_by_admin_id_idx").on(table.createdByAdminId),
  ]
);

export const groupAdmins = sqliteTable(
  "group_admins",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    adminId: text("admin_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("admin"),
    createdAt: timestampMs("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("group_admin_unique").on(table.groupId, table.adminId),
    index("group_admins_admin_id_idx").on(table.adminId),
  ]
);

export const players = sqliteTable(
  "players",
  {
    id: text("id").primaryKey().$defaultFn(generateId),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    notes: text("notes"),
    createdAt: timestampMs("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("players_group_id_created_at_idx").on(table.groupId, table.createdAt),
  ]
);

export const matches = sqliteTable(
  "matches",
  {
    id: text("id").primaryKey().$defaultFn(generateId),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    title: text("title"),
    buyInAmount: integer("buy_in_amount").notNull(), // in cents
    status: text("status").notNull().default("live"), // 'live' | 'settled'
    startedAt: timestampMs("started_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    endedAt: timestampMs("ended_at"),
    createdByAdminId: text("created_by_admin_id")
      .notNull()
      .references(() => admins.id),
    createdAt: timestampMs("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("matches_group_id_created_at_idx").on(table.groupId, table.createdAt),
    index("matches_created_by_admin_id_idx").on(table.createdByAdminId),
  ]
);

export const matchEntries = sqliteTable(
  "match_entries",
  {
    id: text("id").primaryKey().$defaultFn(generateId),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    buyIns: integer("buy_ins").notNull().default(1),
    finalValue: integer("final_value").notNull().default(0), // in cents
    cashedOutAt: timestampMs("cashed_out_at"),
  },
  (table) => [
    index("match_entries_match_id_idx").on(table.matchId),
    index("match_entries_player_id_idx").on(table.playerId),
  ]
);

export const groupShareTokens = sqliteTable(
  "group_share_tokens",
  {
    id: text("id").primaryKey().$defaultFn(generateId),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: timestampMs("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    revokedAt: timestampMs("revoked_at"),
  },
  (table) => [index("group_share_tokens_group_id_idx").on(table.groupId)]
);
