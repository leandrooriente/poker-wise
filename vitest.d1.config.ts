import path from "node:path";

import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(
    path.join(import.meta.dirname, "server/db/migrations")
  );

  return {
    plugins: [
      cloudflareTest({
        miniflare: {
          compatibilityDate: "2026-07-10",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: ["DB"],
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "."),
      },
    },
    test: {
      include: ["test/d1/**/*.test.ts"],
      setupFiles: ["./test/d1/apply-migrations.ts"],
    },
  };
});
