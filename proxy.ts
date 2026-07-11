import { NextRequest, NextResponse } from "next/server";

import { getSessionOptions } from "@/server/auth/session-options";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (
    process.env.MAINTENANCE_MODE === "true" &&
    path.startsWith("/api/admin") &&
    MUTATING_METHODS.has(request.method)
  ) {
    return NextResponse.json(
      { error: "Poker Wise is temporarily read-only for maintenance." },
      { status: 503, headers: { "Retry-After": "600" } }
    );
  }

  // Public routes that don't require authentication
  if (
    path.startsWith("/login") ||
    path === "/share" ||
    path.startsWith("/share/") ||
    path.startsWith("/api/auth") ||
    path === "/api/keepalive"
  ) {
    console.log("[middleware] public route, skipping auth:", path);
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(getSessionOptions().cookieName);
  if (!sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Match all routes except static files and Next.js internals
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|public).*)"],
};
