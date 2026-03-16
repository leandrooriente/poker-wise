/* eslint-disable no-console */import { hash } from "bcryptjs";

import { db } from "@/server/db";
import { admins } from "@/server/db/schema";
import { getEnv } from "@/server/env";

export async function bootstrapAdmin() {
  const existingAdmin = await db.query.admins.findFirst();
  if (existingAdmin) {
    console.log("Admin already exists, skipping bootstrap.");
    return existingAdmin;
  }

  const passwordHash = await hash(getEnv().ADMIN_PASSWORD, 10);
  const [admin] = await db
    .insert(admins)
    .values({
      email: getEnv().ADMIN_EMAIL,
      passwordHash,
    })
    .returning();

  console.log(`Admin created: ${admin.email}`);
  return admin;
}