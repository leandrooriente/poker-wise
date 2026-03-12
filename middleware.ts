import { getIronSession } from "iron-session";
import { NextRequest, NextResponse } from "next/server";

import { sessionOptions, SessionData } from "@/server/auth/session-options";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public routes that don't require authentication
  if (path.startsWith("/login") || path.startsWith("/api/auth")) {
    console.log("[middleware] public route, skipping auth:", path);
    return NextResponse.next();
  }

  console.log("[middleware] checking auth for:", path);

  // Create a response object that we can modify
  const response = NextResponse.next();

  try {
    // Get session using iron-session with request and response
    // Note: NextRequest and NextResponse are compatible with standard Request/Response
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions
    );

    console.log("[middleware] session.isLoggedIn:", session.isLoggedIn);

    // If user is not logged in, redirect to login page
    if (!session.isLoggedIn) {
      console.log("[middleware] not logged in, redirecting to login");
      const loginUrl = new URL("/login", request.url);
      // Add redirect path for after login
      loginUrl.searchParams.set("from", path);
      return NextResponse.redirect(loginUrl);
    }

    console.log("[middleware] authenticated as:", session.email);
  } catch (error) {
    console.error("[middleware] error getting session:", error);
    // Don't crash the middleware, allow request to proceed (will fail later if auth required)
    return response;
  }

  // Return the response (which may have updated session cookies)
  return response;
}

// Match all routes except static files and Next.js internals
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|public).*)"],
};

// Use Node.js runtime to avoid Edge Runtime limitations with crypto module
export const runtime = "nodejs";
