import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/server/auth/session";
import * as groupsQueries from "@/server/db/queries/groups";

export async function GET() {
  try {
    const session = await requireAdmin();
    return NextResponse.json({ activeGroupSlug: session.activeGroupSlug ?? null });
  } catch (error) {
  // eslint-disable-next-line no-console
    console.error("GET /api/admin/active-group error:", error);
    if (error instanceof Response) throw error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { slug } = body;

    if (slug === null) {
      session.activeGroupSlug = null;
      await session.save();
      return NextResponse.json({ activeGroupSlug: null });
    }

    if (typeof slug !== "string") {
      return NextResponse.json({ error: "slug must be a string or null" }, { status: 400 });
    }

    // Verify admin is a member of the group
    const group = await groupsQueries.getGroupBySlugForAdmin(slug, session.adminId);
    if (!group) {
      return NextResponse.json({ error: "Group not found or you do not have permission" }, { status: 404 });
    }

    session.activeGroupSlug = slug;
    await session.save();
    return NextResponse.json({ activeGroupSlug: slug });
  } catch (error) {
  // eslint-disable-next-line no-console
    console.error("PUT /api/admin/active-group error:", error);
    if (error instanceof Response) throw error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}