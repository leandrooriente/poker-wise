/* eslint-disable no-console */
import { readFile } from "node:fs/promises";

import { parseScriptDatabaseOptions, withScriptDatabase } from "./lib/d1";
import {
  createTableManifest,
  MIGRATION_TABLES,
  normalizeMigrationRows,
  type MigrationManifest,
} from "./lib/d1-migration";

function optionValue(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const args = process.argv.slice(2);
  const manifestPath = optionValue(args, "manifest");
  if (!manifestPath) {
    throw new Error(
      "Usage: npm run db:verify:d1 -- --manifest=<path> [--remote] [--env=production] [--persist-to=<path>]"
    );
  }

  const manifest = JSON.parse(
    await readFile(manifestPath, "utf8")
  ) as MigrationManifest;
  if (manifest.formatVersion !== 1) {
    throw new Error(`Unsupported manifest format: ${manifest.formatVersion}`);
  }

  const options = parseScriptDatabaseOptions(args);
  await withScriptDatabase(async (_database, env) => {
    const failures: string[] = [];

    for (const definition of MIGRATION_TABLES) {
      const columns = definition.columns
        .map((column) => `"${column}"`)
        .join(", ");
      const result = await env.DB.prepare(
        `SELECT ${columns} FROM "${definition.name}"`
      ).all<Record<string, unknown>>();
      const actualRows = normalizeMigrationRows(
        definition,
        result.results ?? []
      );
      const actual = createTableManifest(definition, actualRows);
      const expected = manifest.tables[definition.name];

      if (!expected) {
        failures.push(`${definition.name}: missing from manifest`);
      } else if (
        actual.count !== expected.count ||
        actual.sha256 !== expected.sha256
      ) {
        failures.push(
          `${definition.name}: expected ${expected.count}/${expected.sha256}, got ${actual.count}/${actual.sha256}`
        );
      } else {
        console.log(`✓ ${definition.name}: ${actual.count} row(s)`);
      }
    }

    const foreignKeys = await env.DB.prepare("PRAGMA foreign_key_check").all();
    if ((foreignKeys.results?.length ?? 0) > 0) {
      failures.push(
        `foreign_key_check returned ${foreignKeys.results?.length ?? 0} violation(s)`
      );
    } else {
      console.log("✓ foreign_key_check: no violations");
    }

    if (failures.length > 0) {
      throw new Error(`D1 verification failed:\n- ${failures.join("\n- ")}`);
    }
  }, options);

  console.log(
    `D1 matches ${manifest.source} manifest from ${manifest.exportedAt}.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
