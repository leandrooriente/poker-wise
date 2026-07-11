import { SESSION_COOKIE_NAME } from "./constants";

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
    cookieName: SESSION_COOKIE_NAME,
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
