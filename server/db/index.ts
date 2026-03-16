import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/server/env";
import * as schema from "./schema";

const env = getEnv();

const pool = new Pool({
  connectionString: env.POSTGRES_URL,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: true } : false,
});

export const db = drizzle(pool, { schema });
