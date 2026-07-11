import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";

import * as schema from "./schema";

export type Database = DrizzleD1Database<typeof schema>;

let processDatabase: Database | undefined;
const runtimeDatabases = new WeakMap<object, Database>();

export function createDatabase(binding: D1Database): Database {
  return drizzle(binding, { schema });
}

/**
 * Install a database for a standalone script or integration test process.
 * Runtime requests use the Cloudflare D1 binding instead.
 */
export function setProcessDatabase(database: Database | undefined): void {
  processDatabase = database;
}

export function getDb(): Database {
  if (processDatabase) {
    return processDatabase;
  }

  const binding = getCloudflareContext().env.DB;
  const cached = runtimeDatabases.get(binding as object);
  if (cached) {
    return cached;
  }

  const database = createDatabase(binding);
  runtimeDatabases.set(binding as object, database);
  return database;
}
