import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SessionData, sessionOptions } from "./session-options";

import { db } from "@/server/db";
import { admins } from "@/server/db/schema";



export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function login(
  email: string,
  password: string
): Promise<SessionData | null> {
  const admin = await db.query.admins.findFirst({
    where: eq(admins.email, email),
  });
  if (!admin) return null;
  const isValid = await compare(password, admin.passwordHash);
  if (!isValid) return null;
  const session = await getSession();
  session.adminId = admin.id;
  session.email = admin.email;
  session.isLoggedIn = true;
  await session.save();
  console.log("[login] session saved, adminId:", admin.id);
  return session;
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
