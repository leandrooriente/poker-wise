import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { getPlatformProxy, unstable_readConfig } from "wrangler";

import { createDatabase, setProcessDatabase, type Database } from "@/server/db";

export interface ScriptDatabaseOptions {
  environment?: "production";
  remote?: boolean;
  persistTo?: string;
}

async function createRemoteConfig(environment?: "production") {
  const config = unstable_readConfig({
    config: path.resolve("wrangler.jsonc"),
    env: environment,
  });
  if (!config.d1_databases?.length) {
    throw new Error(
      "No D1 database is configured for the selected environment."
    );
  }

  const directory = await mkdtemp(path.join(tmpdir(), "poker-wise-wrangler-"));
  const configPath = path.join(directory, "wrangler.json");
  await writeFile(
    configPath,
    JSON.stringify(
      {
        name: config.name,
        main: config.main,
        compatibility_date: config.compatibility_date,
        compatibility_flags: config.compatibility_flags,
        vars: config.vars,
        d1_databases: (
          config.d1_databases as Array<Record<string, unknown>>
        ).map((database) => ({
          ...database,
          remote: true,
        })),
      },
      null,
      2
    ),
    { mode: 0o600 }
  );

  return {
    configPath,
    dispose: () => rm(directory, { recursive: true, force: true }),
  };
}

export async function withScriptDatabase<T>(
  callback: (db: Database, env: CloudflareEnv) => Promise<T>,
  options: ScriptDatabaseOptions = {}
): Promise<T> {
  const remoteConfig = options.remote
    ? await createRemoteConfig(options.environment)
    : undefined;

  try {
    const proxy = await getPlatformProxy<CloudflareEnv>({
      configPath: remoteConfig?.configPath,
      environment: remoteConfig ? undefined : options.environment,
      envFiles:
        !options.environment && existsSync(".dev.vars")
          ? [path.resolve(".dev.vars")]
          : [],
      persist: options.persistTo
        ? { path: path.join(options.persistTo, "v3") }
        : true,
      remoteBindings: options.remote ?? false,
    });
    const db = createDatabase(proxy.env.DB);
    setProcessDatabase(db);

    try {
      const scriptEnv = { ...process.env, ...proxy.env } as CloudflareEnv;
      return await callback(db, scriptEnv);
    } finally {
      setProcessDatabase(undefined);
      await proxy.dispose();
    }
  } finally {
    await remoteConfig?.dispose();
  }
}

export function parseScriptDatabaseOptions(
  args: string[]
): ScriptDatabaseOptions {
  const production = args.includes("--env=production");
  const remote = args.includes("--remote");
  const persistTo = args
    .find((arg) => arg.startsWith("--persist-to="))
    ?.slice("--persist-to=".length);

  if (production && !remote) {
    throw new Error(
      "The production environment can only be used with --remote."
    );
  }

  return {
    environment: production ? "production" : undefined,
    remote,
    persistTo,
  };
}
