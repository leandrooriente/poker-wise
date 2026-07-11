import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/server/auth/session";
import * as groupsQueries from "@/server/db/queries/groups";
import {
  createGroupShareTokenForAdmin,
  revokeGroupShareTokenForAdmin,
} from "@/server/db/queries/share-tokens";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await requireAdmin();
    const { slug } = await params;

    const group = await groupsQueries.getGroupBySlugForAdmin(
      slug,
      session.adminId
    );
    if (!group) {
      return NextResponse.json(
        { error: "Group not found or you do not have permission" },
        { status: 404 }
      );
    }

    const shareToken = await createGroupShareTokenForAdmin(
      group.id,
      session.adminId
    );
    if (!shareToken) {
      return NextResponse.json(
        { error: "You do not have permission to manage share links" },
        { status: 403 }
      );
    }

    const sharePath = `/share/${encodeURIComponent(shareToken.rawToken)}`;
    const shareUrl = new URL(sharePath, request.nextUrl.origin).toString();

    return NextResponse.json(
      {
        tokenId: shareToken.tokenId,
        shareUrl,
        createdAt: shareToken.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("POST /api/admin/groups/[slug]/share error:", error);
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = (await request.json().catch(() => ({}))) as {
      tokenId?: unknown;
    };
    const { tokenId } = body;

    if (!tokenId || typeof tokenId !== "string") {
      return NextResponse.json(
        { error: "tokenId is required" },
        { status: 400 }
      );
    }

    const revoked = await revokeGroupShareTokenForAdmin(
      tokenId,
      session.adminId
    );
    if (!revoked) {
      return NextResponse.json(
        { error: "Share token not found or you do not have permission" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("DELETE /api/admin/groups/[slug]/share error:", error);
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
