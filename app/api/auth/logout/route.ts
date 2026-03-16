import { NextRequest, NextResponse } from "next/server";

import { logout } from "@/server/auth/session";

export async function POST(request: NextRequest) {
  try {
    await logout();
    // Redirect to login page
    return NextResponse.redirect(new URL("/login", request.url), 302);
  } catch (error) {
  // eslint-disable-next-line no-console
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Use POST to logout" }, { status: 200 });
}