import { existsSync } from "node:fs";
import path from "node:path";

import { getPlatformProxy } from "wrangler";

import { createDatabase, setProcessDatabase, type Database } from "@/server/db";

export interface ScriptDatabaseOptions {
  environment?: "production";
  remote?: boolean;
  persistTo?: string;
}

export async function withScriptDatabase<T>(
  callback: (db: Database, env: CloudflareEnv) => Promise<T>,
  options: ScriptDatabaseOptions = {}
): Promise<T> {
  const proxy = await getPlatformProxy<CloudflareEnv>({
    environment: options.environment,
    envFiles:
      !options.environment && existsSync(".dev.vars") ? [".dev.vars"] : [],
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
