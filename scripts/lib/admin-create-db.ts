import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getAdminCreateEnv } from "./admin-create-env";

import * as schema from "@/server/db/schema";


export function createAdminDb(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>
) {
  const { POSTGRES_URL } = getAdminCreateEnv(env);
  const pool = new Pool({ connectionString: POSTGRES_URL });

  return {
    db: drizzle(pool, { schema }),
    pool,
  };
}
