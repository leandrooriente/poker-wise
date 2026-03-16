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

function serializeMatchWithPlayers(result: {
  match: matchesQueries.MatchRecord;
  players: matchesQueries.MatchPlayerDetails[];
  settlement?: any;
}) {
  return {
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
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    if (!isUuid(id)) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const match = await matchesQueries.getMatchWithPlayersForAdmin(
      id,
      session.adminId
    );
    if (!match) {
      return NextResponse.json(
        { error: "Match not found or you do not have permission" },
        { status: 404 }
      );
    }

    return NextResponse.json(serializeMatchWithPlayers(match));
  } catch (error) {
  // eslint-disable-next-line no-console
    console.error("GET /api/admin/matches/[id] error:", error);
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const updated = await matchesQueries.updateMatchForAdmin(
      id,
      session.adminId,
      {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.buyInAmount !== undefined
          ? { buyInAmount: body.buyInAmount }
          : {}),
        ...(body.players !== undefined ? { players: body.players } : {}),
        ...(body.startedAt !== undefined ? { startedAt: body.startedAt } : {}),
        ...(body.endedAt !== undefined ? { endedAt: body.endedAt } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      }
    );

    if (!updated) {
      return NextResponse.json(
        {
          error:
            "Match not found, invalid players, or you do not have permission",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(serializeMatch(updated));
  } catch (error) {
  // eslint-disable-next-line no-console
    console.error("PUT /api/admin/matches/[id] error:", error);
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    console.log("DELETE match", id);

    if (!isUuid(id)) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const deleted = await matchesQueries.deleteMatchForAdmin(
      id,
      session.adminId
    );
    if (!deleted) {
      return NextResponse.json(
        { error: "Match not found or you do not have permission" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
  // eslint-disable-next-line no-console
    console.error("DELETE /api/admin/matches/[id] error:", error);
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
