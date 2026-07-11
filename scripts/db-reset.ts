/* eslint-disable no-console */
import {
  bootstrapAdmin,
  type AdminBootstrapCredentials,
} from "./lib/bootstrap";
import { parseScriptDatabaseOptions, withScriptDatabase } from "./lib/d1";

import { getDb, type Database } from "@/server/db";
import {
  admins,
  groupAdmins,
  groupShareTokens,
  groups,
  matchEntries,
  matches,
  players,
} from "@/server/db/schema";

export async function resetDatabase(
  database: Database = getDb(),
  credentials?: AdminBootstrapCredentials
) {
  console.log("Resetting database data...");

  await database.batch([
    database.delete(groupShareTokens),
    database.delete(matchEntries),
    database.delete(matches),
    database.delete(players),
    database.delete(groupAdmins),
    database.delete(groups),
    database.delete(admins),
  ]);

  await bootstrapAdmin(database, credentials);
  console.log("Database reset complete.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = parseScriptDatabaseOptions(args);

  if (options.environment === "production") {
    throw new Error("Database reset is permanently disabled for production.");
  }
  if (options.remote && !args.includes("--confirm-remote-dev")) {
    throw new Error(
      "Resetting remote development data requires --confirm-remote-dev."
    );
  }

  withScriptDatabase(
    (database, env) =>
      resetDatabase(database, {
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
      }),
    options
  ).catch((error) => {
    console.error("Failed to reset database:", error);
    process.exit(1);
  });
}
