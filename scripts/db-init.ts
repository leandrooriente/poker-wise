/* eslint-disable no-console */
import {
  bootstrapAdmin,
  type AdminBootstrapCredentials,
} from "./lib/bootstrap";
import { parseScriptDatabaseOptions, withScriptDatabase } from "./lib/d1";

import { getDb, type Database } from "@/server/db";

/**
 * Seed the development admin after committed D1 migrations have been applied.
 * Schema changes are never performed from application builds.
 */
export async function initDatabase(
  database: Database = getDb(),
  credentials?: AdminBootstrapCredentials
) {
  console.log("Initializing database data (idempotent)...");
  await bootstrapAdmin(database, credentials);
  console.log("Database data initialization complete.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseScriptDatabaseOptions(process.argv.slice(2));

  withScriptDatabase(
    (database, env) =>
      initDatabase(database, {
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
      }),
    options
  ).catch((error) => {
    console.error("Failed to initialize database data:", error);
    process.exit(1);
  });
}
