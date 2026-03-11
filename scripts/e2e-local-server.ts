import { spawn } from "node:child_process";

import { Client } from "pg";

import { getE2ELocalEnv } from "../lib/e2e-local-config";

const env = {
  ...process.env,
  ...getE2ELocalEnv(process.env),
};

async function runCommand(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} exited with code ${code ?? "null"}`
        )
      );
    });
  });
}

async function waitForPostgres(connectionString: string) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 60_000) {
    const client = new Client({ connectionString });

    try {
      await client.connect();
      await client.query("select 1");
      await client.end();
      return;
    } catch {
      await client.end().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  throw new Error("Postgres did not become ready within 60 seconds");
}

async function main() {
  await runCommand("docker", ["compose", "up", "-d", "postgres"]);
  await waitForPostgres(env.POSTGRES_URL);
  await runCommand("npx", ["tsx", "scripts/db-init.ts"]);

  const server = spawn("npx", ["next", "dev", "-p", env.PORT], {
    env,
    stdio: "inherit",
  });

  server.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error("Failed to start local E2E server:", error);
  process.exit(1);
});
