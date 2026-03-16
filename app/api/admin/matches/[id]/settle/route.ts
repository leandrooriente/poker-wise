import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/server/auth/session";
import * as matchesQueries from "@/server/db/queries/matches";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function serializeMatch(match: matchesQueries.MatchRecord) {
  return {
    ...match,
    title: match.title ?? undefined,
    startedAt: match.startedAt.toISOString(),
    endedAt: match.endedAt?.toISOString() ?? undefined,
    createdAt: match.createdAt.toISOString(),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    if (!isUuid(id)) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const body = await request.json();
    const result = await matchesQueries.settleMatchForAdmin(
      id,
      session.adminId,
      body.finalValues ?? {}
    );

    if (!result) {
      return NextResponse.json(
        { error: "Match not found or you do not have permission" },
        { status: 404 }
      );
    }

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      match: serializeMatch(result.match),
      players: result.players.map((player) => ({
        user: {
          ...player.user,
          notes: player.user.notes ?? undefined,
          createdAt: player.user.createdAt.toISOString(),
        },
        buyIns: player.buyIns,
        finalValue: player.finalValue,
      })),
      settlement: result.settlement,
    });
  } catch (error) {
  // eslint-disable-next-line no-console
    console.error("POST /api/admin/matches/[id]/settle error:", error);
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
