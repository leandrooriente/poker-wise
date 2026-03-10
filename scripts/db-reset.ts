import { sql } from "drizzle-orm";
import { db } from "./lib/db";
import { bootstrapAdmin } from "./lib/bootstrap";

export async function resetDatabase() {
  console.log("Resetting database...");

  // Drop tables in reverse order of dependencies
  await db.execute(sql`DROP TABLE IF EXISTS group_share_tokens CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS match_entries CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS matches CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS players CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS group_admins CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS groups CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS admins CASCADE`);

  // Enable UUID extension (atomic, handles concurrent attempts)
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  // Create tables
  await db.execute(sql`
    CREATE TABLE admins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      created_by_admin_id UUID NOT NULL REFERENCES admins(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE group_admins (
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL DEFAULT 'admin',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(group_id, admin_id)
    )
  `);

  await db.execute(sql`
    CREATE TABLE players (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE matches (
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
    CREATE TABLE match_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      buy_ins INTEGER NOT NULL DEFAULT 1,
      final_value INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE TABLE group_share_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMP
    )
  `);

  // Bootstrap admin
  await bootstrapAdmin();

  console.log("Database reset complete.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  resetDatabase().catch((err) => {
    console.error("Failed to reset database:", err);
    process.exit(1);
  });
}