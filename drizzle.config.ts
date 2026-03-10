import { defineConfig } from "drizzle-kit";
import { getEnv } from "./server/env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dbCredentials: {
    url: getEnv().POSTGRES_URL,
  },
});