/* eslint-disable no-console */
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

import dotenv from "dotenv";

function optionValue(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const args = process.argv.slice(2);
  const environment = optionValue(args, "env");
  if (environment !== "development" && environment !== "production") {
    throw new Error(
      "Usage: npm run cf:secrets -- --env=development|production [--source=<env-file>] [--maintenance=true|false]"
    );
  }

  const sourcePath =
    optionValue(args, "source") ??
    (environment === "production" ? ".env.production.local" : ".env.local");
  const maintenanceMode = optionValue(args, "maintenance") ?? "false";
  if (maintenanceMode !== "true" && maintenanceMode !== "false") {
    throw new Error("--maintenance must be true or false");
  }

  const source = dotenv.parse(await readFile(sourcePath));
  if (!source.AUTH_SECRET) {
    throw new Error(`AUTH_SECRET is missing from ${sourcePath}`);
  }

  const secrets: Record<string, string> = {
    AUTH_SECRET: source.AUTH_SECRET,
    MAINTENANCE_MODE: maintenanceMode,
  };
  if (environment === "development") {
    if (!source.ADMIN_EMAIL || !source.ADMIN_PASSWORD) {
      throw new Error(
        `ADMIN_EMAIL and ADMIN_PASSWORD are missing from ${sourcePath}`
      );
    }
    secrets.ADMIN_EMAIL = source.ADMIN_EMAIL;
    secrets.ADMIN_PASSWORD = source.ADMIN_PASSWORD;
  }

  const wranglerArgs = ["wrangler", "secret", "bulk"];
  if (environment === "production") {
    wranglerArgs.push("--env", "production");
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn("npx", wranglerArgs, {
      stdio: ["pipe", "inherit", "inherit"],
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`wrangler secret bulk exited with ${code}`));
    });
    child.stdin.end(JSON.stringify(secrets));
  });

  console.log(
    `Updated ${environment} Worker secrets from ${sourcePath} (values hidden).`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
