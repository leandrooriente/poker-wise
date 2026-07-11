/* eslint-disable no-console */
import { hash } from "bcryptjs";

import { getDb, type Database } from "@/server/db";
import { admins } from "@/server/db/schema";

export interface AdminBootstrapCredentials {
  email: string;
  password: string;
}

export function getAdminBootstrapCredentials(
  env: NodeJS.ProcessEnv = process.env
): AdminBootstrapCredentials {
  const email = env.ADMIN_EMAIL;
  const password = env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD are required to bootstrap a development admin."
    );
  }

  return { email, password };
}

export async function bootstrapAdmin(
  database: Database = getDb(),
  credentials: AdminBootstrapCredentials = getAdminBootstrapCredentials()
) {
  const existingAdmin = await database.query.admins.findFirst();
  if (existingAdmin) {
    console.log("Admin already exists, skipping bootstrap.");
    return existingAdmin;
  }

  const passwordHash = await hash(credentials.password, 10);
  const [admin] = await database
    .insert(admins)
    .values({
      email: credentials.email,
      passwordHash,
    })
    .returning();

  console.log(`Admin created: ${admin.email}`);
  return admin;
}
