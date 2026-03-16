/* eslint-disable no-console */ import { sql } from "drizzle-orm";

import { bootstrapAdmin } from "./lib/bootstrap";

import { db } from "@/server/db";
import { isEnvValid } from "@/server/env";

/**
 * Idempotent database initialization.
 * Creates tables if they don't exist, enables UUID extension, and bootstraps admin.
 * Safe to run multiple times.
 */
export async function initDatabase() {
  if (!isEnvValid()) {
    console.log(
      "Skipping database initialization because environment variables are invalid or missing."
    );
    return;
  }
  console.log("Initializing database (idempotent)...");

  // Enable UUID extension (atomic, handles concurrent attempts)
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  // Create tables in dependency order
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      created_by_admin_id UUID NOT NULL REFERENCES admins(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS group_admins (
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL DEFAULT 'admin',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(group_id, admin_id)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS players (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS matches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      title VARCHAR(255),
      buy_in_amount INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'live',
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMP,
      created_by_admin_id UUID NOT NULL REFERENCES admins(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS match_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      buy_ins INTEGER NOT NULL DEFAULT 1,
      final_value INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS group_share_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMP
    )
  `);

  // Bootstrap admin (if missing)
  await bootstrapAdmin();

  console.log("Database initialization complete.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase().catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
}
