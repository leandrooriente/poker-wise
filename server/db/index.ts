import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/server/env";
import * as schema from "./schema";

const pool = new Pool({ connectionString: getEnv().POSTGRES_URL });

export const db = drizzle(pool, { schema });