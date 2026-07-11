/* eslint-disable no-console */
import { readFile } from "node:fs/promises";

import dotenv from "dotenv";
import { Client } from "pg";

import {
  parsePostgresWriteFreezeArgs,
  quotePostgresIdentifier,
  resolvePostgresWriteFreezeConnectionStrings,
  type PostgresWriteFreezeMode,
} from "./lib/postgres-write-freeze";

interface SourceIdentity {
  database: string;
  role: string;
  is_owner: boolean;
  can_signal: boolean;
}

interface PersistentSetting {
  database: string;
  role: string;
  setting: string;
}

function createClient(
  connectionString: string,
  sslNoVerify: boolean,
  label: string
): Client {
  const config = sslNoVerify
    ? (() => {
        const url = new URL(connectionString);
        url.searchParams.delete("sslmode");
        url.searchParams.delete("uselibpqcompat");
        return {
          connectionString: url.toString(),
          ssl: { rejectUnauthorized: false },
        };
      })()
    : { connectionString };
  const client = new Client({
    ...config,
    application_name: `poker-wise-write-freeze-${label}`,
  });

  // pg emits an error event when another probe deliberately terminates this
  // backend. Without a listener, that expected recycle crashes the process.
  client.on("error", () => undefined);
  return client;
}

async function safeEnd(client: Client | undefined): Promise<void> {
  if (!client) return;
  await client.end().catch(() => undefined);
}

async function applyDefaults(
  client: Client,
  mode: PostgresWriteFreezeMode,
  database: string,
  role: string
): Promise<void> {
  const databaseIdentifier = quotePostgresIdentifier(database);
  const roleIdentifier = quotePostgresIdentifier(role);

  // A connection opened while frozen starts read-only. Override this control
  // session before resetting the catalog defaults during rollback/unfreeze.
  if (mode === "unfreeze") {
    await client.query("SET default_transaction_read_only = off");
  }

  await client.query("BEGIN");
  try {
    if (mode === "freeze") {
      await client.query(
        `ALTER DATABASE ${databaseIdentifier} SET default_transaction_read_only = on`
      );
      await client.query(
        `ALTER ROLE ${roleIdentifier} IN DATABASE ${databaseIdentifier} SET default_transaction_read_only = on`
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
): Promise<number> {
  const result = await client.query<{ terminated: boolean }>(`
    SELECT pg_terminate_backend(pid) AS terminated
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND usename = current_user
      AND pid <> pg_backend_pid()
  `);
  const failed = result.rows.filter((row) => !row.terminated).length;
  if (failed > 0) {
    throw new Error(
      `${failed} of ${result.rows.length} existing application connections could not be terminated.`
    );
  }
  return result.rows.length;
}

async function readDefault(client: Client): Promise<string> {
  const result = await client.query<{ default_transaction_read_only: string }>(
    "SHOW default_transaction_read_only"
  );
  return result.rows[0].default_transaction_read_only;
}

async function readPersistentSettings(
  client: Client
): Promise<PersistentSetting[]> {
  const result = await client.query<PersistentSetting>(`
    SELECT
      COALESCE(database_settings.datname, '*') AS database,
      COALESCE(role_settings.rolname, '*') AS role,
      setting.setting
    FROM pg_db_role_setting AS configured
    LEFT JOIN pg_database AS database_settings
      ON database_settings.oid = configured.setdatabase
    LEFT JOIN pg_roles AS role_settings
      ON role_settings.oid = configured.setrole
    CROSS JOIN LATERAL unnest(configured.setconfig) AS setting(setting)
    WHERE (configured.setrole = 0 OR role_settings.rolname = current_user)
      AND (configured.setdatabase = 0 OR database_settings.datname = current_database())
      AND setting.setting LIKE 'default_transaction_read_only=%'
    ORDER BY database, role
  `);
  return result.rows;
}

function verifyPersistentSettings(
  mode: PostgresWriteFreezeMode,
  settings: PersistentSetting[]
): void {
  if (
    mode === "freeze" &&
    (settings.length < 2 ||
      settings.some(
        ({ setting }) => setting !== "default_transaction_read_only=on"
      ))
  ) {
    throw new Error(
      `Persistent write-freeze settings are incomplete: ${JSON.stringify(settings)}`
    );
  }
  if (mode === "unfreeze" && settings.length > 0) {
    throw new Error(
      `Persistent write-freeze settings remain after unfreeze: ${JSON.stringify(settings)}`
    );
  }
}

async function main() {
  const options = parsePostgresWriteFreezeArgs(process.argv.slice(2));
  const env = dotenv.parse(await readFile(options.envFile));
  const connectionStrings = resolvePostgresWriteFreezeConnectionStrings(env);
  const expected = options.mode === "freeze" ? "on" : "off";

  let control: Client | undefined;
  let sessionProbe: Client | undefined;
  let transactionProbe: Client | undefined;
  let finalSession: Client | undefined;
  let finalTransaction: Client | undefined;
  let postFlushTransaction: Client | undefined;
  let identity: SourceIdentity | undefined;
  let recycled = 0;

  try {
    control = createClient(
      connectionStrings.session,
      options.sslNoVerify,
      `${options.mode}-control`
    );
    await control.connect();
    identity = (
      await control.query<SourceIdentity>(`
        SELECT
          current_database() AS database,
          current_user AS role,
          pg_get_userbyid(datdba) = current_user AS is_owner,
          pg_has_role(current_user, 'pg_signal_backend', 'MEMBER') AS can_signal
        FROM pg_database
        WHERE datname = current_database()
      `)
    ).rows[0];
    if (!identity?.is_owner || !identity.can_signal) {
      throw new Error(
        "The source role must own the database and be able to terminate application connections."
      );
    }

    await applyDefaults(
      control,
      options.mode,
      identity.database,
      identity.role
    );

    // Flush stale Supabase pool backends while retaining the control backend.
    // The next session connection must therefore initialize from the new
    // database/role defaults rather than reuse the control session's old state.
    recycled += await terminateExistingApplicationConnections(control);

    sessionProbe = createClient(
      connectionStrings.session,
      options.sslNoVerify,
      `${options.mode}-session-probe`
    );
    await sessionProbe.connect();
    const initialSession = await readDefault(sessionProbe);
    if (initialSession !== expected) {
      throw new Error(
        `Fresh session-pool probe expected read-only=${expected}, got ${initialSession}.`
      );
    }

    // Recycle the old control backend and any application connection that raced
    // with the first flush. sessionProbe is known to have the intended default.
    recycled += await terminateExistingApplicationConnections(sessionProbe);
    await safeEnd(control);
    control = undefined;

    transactionProbe = createClient(
      connectionStrings.transaction,
      options.sslNoVerify,
      `${options.mode}-transaction-probe`
    );
    await transactionProbe.connect();
    const initialTransaction = await readDefault(transactionProbe);
    if (initialTransaction !== expected) {
      throw new Error(
        `Fresh transaction-pool probe expected read-only=${expected}, got ${initialTransaction}.`
      );
    }

    // Flush the transaction probe backend and any new application connections.
    recycled += await terminateExistingApplicationConnections(sessionProbe);
    await safeEnd(transactionProbe);
    transactionProbe = undefined;
    await safeEnd(sessionProbe);
    sessionProbe = undefined;

    finalSession = createClient(
      connectionStrings.session,
      options.sslNoVerify,
      `${options.mode}-final-session`
    );
    await finalSession.connect();
    finalTransaction = createClient(
      connectionStrings.transaction,
      options.sslNoVerify,
      `${options.mode}-final-transaction`
    );
    await finalTransaction.connect();

    const finalSessionDefault = await readDefault(finalSession);
    const finalTransactionDefault = await readDefault(finalTransaction);
    if (
      finalSessionDefault !== expected ||
      finalTransactionDefault !== expected
    ) {
      throw new Error(
        `Final pool probes expected read-only=${expected}, got session=${finalSessionDefault}, transaction=${finalTransactionDefault}.`
      );
    }
    verifyPersistentSettings(
      options.mode,
      await readPersistentSettings(finalSession)
    );

    recycled += await terminateExistingApplicationConnections(finalSession);
    await safeEnd(finalTransaction);
    finalTransaction = undefined;
    await safeEnd(finalSession);
    finalSession = undefined;

    // Prove the transaction endpoint used by Vercel still has the intended
    // state after all backend recycling has completed.
    postFlushTransaction = createClient(
      connectionStrings.transaction,
      options.sslNoVerify,
      `${options.mode}-post-flush-transaction`
    );
    await postFlushTransaction.connect();
    const postFlushDefault = await readDefault(postFlushTransaction);
    if (postFlushDefault !== expected) {
      throw new Error(
        `Post-flush transaction-pool probe expected read-only=${expected}, got ${postFlushDefault}.`
      );
    }

    console.log(
      `${options.mode === "freeze" ? "Frozen" : "Unfrozen"} production PostgreSQL writes; recycled ${recycled} existing application connection(s).`
    );
    console.log(
      `Verified new ${identity.database}/${identity.role} session and transaction pool connections default to read-only=${expected}.`
    );
  } finally {
    await safeEnd(postFlushTransaction);
    await safeEnd(finalTransaction);
    await safeEnd(finalSession);
    await safeEnd(transactionProbe);
    await safeEnd(sessionProbe);
    await safeEnd(control);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
