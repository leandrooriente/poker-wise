import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/server/db/schema";

import { getAdminCreateEnv } from "./admin-create-env";

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
