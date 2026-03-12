import { NextRequest, NextResponse } from "next/server";

import { getSessionOptions } from "@/server/auth/session-options";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public routes that don't require authentication
  if (path.startsWith("/login") || path.startsWith("/api/auth")) {
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
