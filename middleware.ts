import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/server/auth/constants";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const maintenanceMode = process.env.MAINTENANCE_MODE as string | undefined;
  const isWriteRequest = !["GET", "HEAD", "OPTIONS"].includes(request.method);

  if (
    maintenanceMode === "true" &&
    isWriteRequest &&
    path.startsWith("/api/admin")
  ) {
    return NextResponse.json(
      { error: "Poker Wise is temporarily read-only for maintenance." },
      { status: 503, headers: { "Retry-After": "60" } }
    );
  }

  // Public routes that don't require authentication
  if (
    path.startsWith("/login") ||
    path === "/share" ||
    path.startsWith("/share/") ||
    path.startsWith("/api/auth")
  ) {
    console.log("[middleware] public route, skipping auth:", path);
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
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
