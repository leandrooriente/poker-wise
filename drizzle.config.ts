import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load environment variables for migration generation
dotenv.config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dbCredentials: {
    url: process.env.POSTGRES_URL || "postgresql://user:pass@localhost:5432/db",
  },
});