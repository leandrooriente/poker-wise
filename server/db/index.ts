import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

import { getEnv } from "@/server/env";

const env = getEnv();

export function resolvePgSslConfig(
  nodeEnv: string,
  vercelEnv: string | undefined
) {
  if (nodeEnv !== "production") {
    return false;
  }

  if (vercelEnv === "preview") {
    return { rejectUnauthorized: false };
  }

  return { rejectUnauthorized: true };
}

const pool = new Pool({
  connectionString: env.POSTGRES_URL,
  ssl: resolvePgSslConfig(env.NODE_ENV, process.env.VERCEL_ENV),
});

export const db = drizzle(pool, { schema });
