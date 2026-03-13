import { getEnv } from "@/server/env";

export interface SessionData {
  adminId: string;
  email: string;
  isLoggedIn: boolean;
  activeGroupSlug: string | null;
}

export function getSessionOptions() {
  const env = getEnv();
  return {
    password: env.AUTH_SECRET,
    cookieName: "poker-wise-admin-session",
    // secure: true should be used in production (HTTPS) but can be false in development
    cookieOptions: {
      secure: env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

// For backward compatibility with existing imports
export const sessionOptions = getSessionOptions();
