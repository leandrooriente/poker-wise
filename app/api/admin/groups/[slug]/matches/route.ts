import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/server/auth/session";
import * as groupsQueries from "@/server/db/queries/groups";
import * as matchesQueries from "@/server/db/queries/matches";

function serializeMatch(match: matchesQueries.MatchRecord) {
  return {
    ...match,
    title: match.title ?? undefined,
    startedAt: match.startedAt.toISOString(),
    endedAt: match.endedAt?.toISOString() ?? undefined,
    createdAt: match.createdAt.toISOString(),
  };
}

export async function GET(
  _request: NextRequest,
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

    const matches = await matchesQueries.listMatchesForGroupForAdmin(
      group.id,
      session.adminId
    );

    return NextResponse.json(matches.map(serializeMatch));
  } catch (error) {
    console.error("GET /api/admin/groups/[slug]/matches error:", error);
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const { title, buyInAmount, players, startedAt, endedAt, status } = body;

    if (!Array.isArray(players) || players.length === 0) {
      return NextResponse.json(
        { error: "At least one player is required" },
        { status: 400 }
      );
    }

    if (typeof buyInAmount !== "number" || Number.isNaN(buyInAmount)) {
      return NextResponse.json(
        { error: "A valid buy-in amount is required" },
        { status: 400 }
      );
    }

    const created = await matchesQueries.createMatchForAdmin(
      {
        groupId: group.id,
        title:
          typeof title === "string" && title.trim() ? title.trim() : undefined,
        buyInAmount,
        players,
        startedAt,
        endedAt,
        status,
      },
      session.adminId
    );

    if (!created) {
      return NextResponse.json(
        { error: "Failed to create match" },
        { status: 400 }
      );
    }

    return NextResponse.json(serializeMatch(created), { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/groups/[slug]/matches error:", error);
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
