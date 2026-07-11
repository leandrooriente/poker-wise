/* eslint-disable no-console */
import { spawn } from "node:child_process";
import { access, mkdir, rm, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const workerPath = path.resolve(".open-next/worker.js");
  const workerDirectory = path.dirname(workerPath);
  const createdStub = !(await exists(workerPath));

  if (createdStub) {
    await mkdir(workerDirectory, { recursive: true });
    await writeFile(workerPath, "export default {};\n", { flag: "wx" });
  }

  try {
    const executable = process.platform === "win32" ? "npx.cmd" : "npx";
    const args = [
      "wrangler",
      "types",
      "--env-file",
      ".dev.vars.example",
      "--env-interface",
      "CloudflareEnv",
      "--include-runtime",
      "false",
      "cloudflare-env.d.ts",
      ...process.argv.slice(2),
    ];

    const exitCode = await new Promise<number>((resolve, reject) => {
      const child = spawn(executable, args, { stdio: "inherit" });
      child.on("error", reject);
      child.on("exit", (code, signal) => {
        if (signal) reject(new Error(`wrangler types exited on ${signal}`));
        else resolve(code ?? 1);
      });
    });

    if (exitCode !== 0) process.exitCode = exitCode;
  } finally {
    if (createdStub) {
      await rm(workerPath, { force: true });
      await rmdir(workerDirectory).catch(() => undefined);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
