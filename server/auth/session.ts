import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { compare } from "bcryptjs";
import { getEnv } from "@/server/env";
import { db } from "@/server/db";
import { admins } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export interface SessionData {
  adminId: string;
  email: string;
  isLoggedIn: boolean;
}

export const sessionOptions = {
  password: getEnv().AUTH_SECRET,
  cookieName: "poker-wise-admin-session",
  // secure: true should be used in production (HTTPS) but can be false in development
  cookieOptions: {
    secure: getEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function login(email: string, password: string): Promise<SessionData | null> {
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
  return session;
}