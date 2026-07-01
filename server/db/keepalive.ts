import { sql } from "drizzle-orm";

import { db } from "@/server/db";

export async function pingDatabase(): Promise<void> {
  await db.execute(sql`select 1`);
}
