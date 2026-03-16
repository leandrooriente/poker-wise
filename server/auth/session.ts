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
  console.log("[ensureAdminExists] checking for existing admin");
  try {
    const existingAdmin = await db.query.admins.findFirst();
    if (existingAdmin) {
      console.log(
        "[ensureAdminExists] admin already exists:",
        existingAdmin.email
      );
      return existingAdmin;
    }
    console.log("[ensureAdminExists] no admin found, creating new one");
    const env = getEnv();
    console.log("[ensureAdminExists] env.ADMIN_EMAIL:", env.ADMIN_EMAIL);
    console.log(
      "[ensureAdminExists] env.ADMIN_PASSWORD present:",
      !!env.ADMIN_PASSWORD
    );
    console.log(
      "[ensureAdminExists] env.AUTH_SECRET present:",
      !!env.AUTH_SECRET
    );
    // Log POSTGRES_URL with masked password for debugging
    const maskedUrl = env.POSTGRES_URL.replace(
      /\/\/([^:]+):([^@]+)@/,
      "//$1:****@"
    );
    console.log("[ensureAdminExists] env.POSTGRES_URL:", maskedUrl);
    const passwordHash = await hash(env.ADMIN_PASSWORD, 10);
    console.log("[ensureAdminExists] password hash generated");
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
  console.log("[login] starting login for email:", email);
  try {
    await ensureAdminExists();
    console.log("[login] ensureAdminExists completed");
    const admin = await db.query.admins.findFirst({
      where: eq(admins.email, email),
    });
    if (!admin) {
      console.log("[login] admin not found for email:", email);
      return null;
    }
    console.log("[login] admin found, id:", admin.id);
    const isValid = await compare(password, admin.passwordHash);
    if (!isValid) {
      console.log("[login] password invalid");
      return null;
    }
    console.log("[login] password valid");
    const session = await getSession();
    session.adminId = admin.id;
    session.email = admin.email;
    session.isLoggedIn = true;
    await session.save();
    console.log("[login] session saved, adminId:", admin.id);
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
  console.log("[requireAdmin] session:", session);
  if (!session.isLoggedIn) {
    console.log("[requireAdmin] not logged in, redirecting");
    redirect("/login");
  }
  console.log("[requireAdmin] admin authorized:", session.email);
  return session;
}
