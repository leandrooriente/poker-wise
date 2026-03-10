import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/server/env";
import * as schema from "./schema";

const pool = new Pool({ connectionString: env.POSTGRES_URL });

export const db = drizzle(pool, { schema });