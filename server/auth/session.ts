import { compare, hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SessionData, sessionOptions } from "./session-options";
import { getEnv } from "@/server/env";

import { db } from "@/server/db";
import { admins } from "@/server/db/schema";

async function ensureAdminExists() {
  try {
    const existingAdmin = await db.query.admins.findFirst();
    if (existingAdmin) {
      return existingAdmin;
    }
    console.log("[ensureAdminExists] no admin found, creating new one");
    const env = getEnv();

    const passwordHash = await hash(env.ADMIN_PASSWORD, 10);

    const [admin] = await db
      .insert(admins)
      .values({
        email: env.ADMIN_EMAIL,
        passwordHash,
      })
      .returning();
    console.log("[ensureAdminExists] admin created:", admin.email);
    return admin;
  } catch (error) {
    console.error("[ensureAdminExists] error:", error);
    throw error;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function login(
  email: string,
  password: string
): Promise<SessionData | null> {
  try {
    await ensureAdminExists();

    const admin = await db.query.admins.findFirst({
      where: eq(admins.email, email),
    });
    if (!admin) {
      console.log("[login] admin not found for email:", email);
      return null;
    }

    const isValid = await compare(password, admin.passwordHash);
    if (!isValid) {
      console.log("[login] password invalid");
      return null;
    }

    const session = await getSession();
    session.adminId = admin.id;
    session.email = admin.email;
    session.isLoggedIn = true;
    await session.save();

    return session;
  } catch (error) {
    console.error("[login] error:", error);
    throw error;
  }
}

export async function logout() {
  const session = await getSession();
  await session.destroy();
}

export async function requireAdmin() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    console.log("[requireAdmin] not logged in, redirecting");
    redirect("/login");
  }
  console.log("[requireAdmin] admin authorized:", session.email);
  return session;
}
