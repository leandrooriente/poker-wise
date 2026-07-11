/* eslint-disable no-console */
import { spawn } from "node:child_process";

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

async function main() {
  await runCommand("npx", [
    "wrangler",
    "d1",
    "migrations",
    "apply",
    "poker-wise-dev",
    "--local",
  ]);
  await runCommand("npx", ["tsx", "scripts/db-reset.ts"]);

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
