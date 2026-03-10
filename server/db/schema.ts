import { pgTable, uuid, varchar, integer, timestamp, boolean, uniqueIndex, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => admins.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupAdmins = pgTable("group_admins", {
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  adminId: uuid("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull().default("admin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("group_admin_unique").on(table.groupId, table.adminId),
]);

export const players = pgTable("players", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  buyInAmount: integer("buy_in_amount").notNull(), // in cents
  status: varchar("status", { length: 20 }).notNull().default("live"), // 'live' | 'settled'
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => admins.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const matchEntries = pgTable("match_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
  playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  buyIns: integer("buy_ins").notNull().default(1),
  finalValue: integer("final_value").notNull().default(0), // in cents
});

export const groupShareTokens = pgTable("group_share_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  revokedAt: timestamp("revoked_at"),
});