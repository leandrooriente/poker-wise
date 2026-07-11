/* eslint-disable no-console */
import { readFile } from "node:fs/promises";

import dotenv from "dotenv";
import { Client } from "pg";

import {
  parsePostgresWriteFreezeArgs,
  quotePostgresIdentifier,
  type PostgresWriteFreezeMode,
} from "./lib/postgres-write-freeze";

function resolveConnectionString(env: Record<string, string>): string {
  const connectionString = env.POSTGRES_URL_NON_POOLING ?? env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error(
      "POSTGRES_URL_NON_POOLING or POSTGRES_URL is required in the production env file."
    );
  }
  return connectionString;
}

function createClient(connectionString: string, sslNoVerify: boolean): Client {
  if (!sslNoVerify) return new Client({ connectionString });

  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("uselibpqcompat");
  return new Client({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
  });
}

async function applyDefaults(
  client: Client,
  mode: PostgresWriteFreezeMode,
  database: string,
  role: string
): Promise<void> {
  const databaseIdentifier = quotePostgresIdentifier(database);
  const roleIdentifier = quotePostgresIdentifier(role);
  const setting = mode === "freeze" ? "on" : "off";

  // A connection opened while frozen starts read-only. Override this session
  // before resetting the catalog defaults during rollback/unfreeze.
  if (mode === "unfreeze") {
    await client.query("SET default_transaction_read_only = off");
  }

  await client.query("BEGIN");
  try {
    if (mode === "freeze") {
      await client.query(
        `ALTER DATABASE ${databaseIdentifier} SET default_transaction_read_only = ${setting}`
      );
      await client.query(
        `ALTER ROLE ${roleIdentifier} IN DATABASE ${databaseIdentifier} SET default_transaction_read_only = ${setting}`
      );
    } else {
      await client.query(
        `ALTER ROLE ${roleIdentifier} IN DATABASE ${databaseIdentifier} RESET default_transaction_read_only`
      );
      await client.query(
        `ALTER DATABASE ${databaseIdentifier} RESET default_transaction_read_only`
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

async function terminateExistingApplicationConnections(
  client: Client
): Promise<{ attempted: number; failed: number }> {
  const result = await client.query<{ terminated: boolean }>(`
    SELECT pg_terminate_backend(pid) AS terminated
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND usename = current_user
      AND pid <> pg_backend_pid()
  `);

  return {
    attempted: result.rows.length,
    failed: result.rows.filter((row) => !row.terminated).length,
  };
}

async function readDefault(client: Client): Promise<string> {
  const result = await client.query<{ default_transaction_read_only: string }>(
    "SHOW default_transaction_read_only"
  );
  return result.rows[0].default_transaction_read_only;
}

async function main() {
  const options = parsePostgresWriteFreezeArgs(process.argv.slice(2));
  const env = dotenv.parse(await readFile(options.envFile));
  const connectionString = resolveConnectionString(env);
  const client = createClient(connectionString, options.sslNoVerify);

  await client.connect();
  let database: string;
  let role: string;
  try {
    const identity = await client.query<{
      database: string;
      role: string;
      is_owner: boolean;
      can_signal: boolean;
    }>(`
      SELECT
        current_database() AS database,
        current_user AS role,
        pg_get_userbyid(datdba) = current_user AS is_owner,
        pg_has_role(current_user, 'pg_signal_backend', 'MEMBER') AS can_signal
      FROM pg_database
      WHERE datname = current_database()
    `);
    const current = identity.rows[0];
    if (!current?.is_owner || !current.can_signal) {
      throw new Error(
        "The source role must own the database and be able to terminate application connections."
      );
    }
    database = current.database;
    role = current.role;

    await applyDefaults(client, options.mode, database, role);
    const terminated = await terminateExistingApplicationConnections(client);
    if (terminated.failed > 0) {
      throw new Error(
        `${terminated.failed} of ${terminated.attempted} existing application connections could not be terminated. Catalog defaults were still updated; verify the freeze state manually.`
      );
    }
    console.log(
      `${options.mode === "freeze" ? "Frozen" : "Unfrozen"} production PostgreSQL writes; recycled ${terminated.attempted} existing application connection(s).`
    );
  } finally {
    await client.end();
  }

  const verificationClient = createClient(
    connectionString,
    options.sslNoVerify
  );
  await verificationClient.connect();
  try {
    const actual = await readDefault(verificationClient);
    const expected = options.mode === "freeze" ? "on" : "off";
    if (actual !== expected) {
      throw new Error(
        `Write-freeze verification failed: expected ${expected}, got ${actual}.`
      );
    }
    console.log(
      `Verified new ${database}/${role} connections default to read-only=${actual}.`
    );
  } finally {
    await verificationClient.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
