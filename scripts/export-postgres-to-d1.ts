/* eslint-disable no-console */
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import dotenv from "dotenv";
import { Client } from "pg";

import {
  createInsertStatements,
  createTableManifest,
  MIGRATION_TABLES,
  normalizeMigrationRows,
  type MigrationManifest,
  type MigrationRow,
} from "./lib/d1-migration";

interface ExportOptions {
  source: "development" | "production";
  envFile: string;
  urlEnv?: string;
  outputDirectory: string;
  sslNoVerify: boolean;
}

function optionValue(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function parseOptions(args: string[]): ExportOptions {
  const source = optionValue(args, "source");
  if (source !== "development" && source !== "production") {
    throw new Error(
      "Usage: npm run db:export:postgres -- --source=development|production [--env-file=<path>] [--url-env=<name>] [--output=<directory>] [--ssl-no-verify]"
    );
  }

  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  return {
    source,
    envFile:
      optionValue(args, "env-file") ??
      (source === "production" ? ".env.production.local" : ".env.local"),
    urlEnv: optionValue(args, "url-env"),
    outputDirectory:
      optionValue(args, "output") ??
      path.join(".migration-artifacts", `${source}-${timestamp}`),
    sslNoVerify: args.includes("--ssl-no-verify"),
  };
}

function resolveConnectionString(
  options: ExportOptions,
  env: Record<string, string>
): string {
  const candidateKeys = options.urlEnv
    ? [options.urlEnv]
    : options.source === "production"
      ? ["POSTGRES_URL_NON_POOLING", "POSTGRES_URL"]
      : [
          "DEV_POSTGRES_URL_NON_POOLING",
          "POSTGRES_URL_NON_POOLING",
          "DEV_POSTGRES_URL",
          "POSTGRES_URL",
        ];

  for (const key of candidateKeys) {
    if (env[key]) return env[key];
  }

  throw new Error(
    `No PostgreSQL URL found in ${options.envFile}. Checked: ${candidateKeys.join(", ")}`
  );
}

function createClient(connectionString: string, sslNoVerify: boolean): Client {
  if (!sslNoVerify) {
    return new Client({ connectionString });
  }

  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("uselibpqcompat");
  return new Client({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
  });
}

async function exportDatabase(options: ExportOptions): Promise<void> {
  const parsedEnv = dotenv.parse(await readFile(options.envFile));
  const connectionString = resolveConnectionString(options, parsedEnv);
  const client = createClient(connectionString, options.sslNoVerify);
  const rowsByTable = new Map<string, MigrationRow[]>();

  await client.connect();
  try {
    await client.query(
      "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"
    );
    await client.query("SET LOCAL search_path TO public");
    await client.query("SET LOCAL TIME ZONE 'UTC'");

    for (const definition of MIGRATION_TABLES) {
      const result = await client.query<Record<string, unknown>>(
        definition.postgresQuery
      );
      rowsByTable.set(
        definition.name,
        normalizeMigrationRows(definition, result.rows)
      );
    }
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    await client.end();
  }

  const exportedAt = new Date().toISOString();
  const manifest: MigrationManifest = {
    formatVersion: 1,
    source: options.source,
    exportedAt,
    tables: {},
  };
  const sqlLines = [
    "-- Poker Wise PostgreSQL to D1 data export",
    `-- Source environment: ${options.source}`,
    `-- Exported at: ${exportedAt}`,
    "-- Apply only after the committed D1 schema migration, to empty app tables.",
    "",
  ];

  for (const definition of MIGRATION_TABLES) {
    const rows = rowsByTable.get(definition.name) ?? [];
    manifest.tables[definition.name] = createTableManifest(definition, rows);
    sqlLines.push(`-- ${definition.name}: ${rows.length} row(s)`);
    sqlLines.push(...createInsertStatements(definition, rows), "");
  }

  await mkdir(options.outputDirectory, { recursive: true, mode: 0o700 });
  await chmod(options.outputDirectory, 0o700);
  const sqlPath = path.join(options.outputDirectory, "data.sql");
  const manifestPath = path.join(options.outputDirectory, "manifest.json");
  await writeFile(sqlPath, sqlLines.join("\n"), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  await Promise.all([chmod(sqlPath, 0o600), chmod(manifestPath, 0o600)]);

  console.log(`Exported ${options.source} database snapshot.`);
  for (const definition of MIGRATION_TABLES) {
    console.log(
      `  ${definition.name}: ${manifest.tables[definition.name].count}`
    );
  }
  console.log(`D1 import SQL: ${sqlPath}`);
  console.log(`Verification manifest: ${manifestPath}`);
}

const options = parseOptions(process.argv.slice(2));
exportDatabase(options).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
