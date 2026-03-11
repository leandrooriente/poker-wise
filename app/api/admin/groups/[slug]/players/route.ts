import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import * as groupsQueries from "@/server/db/queries/groups";
import * as playersQueries from "@/server/db/queries/players";

/**
 * GET /api/admin/groups/[slug]/players
 * Returns all players in the group, only if the authenticated admin is a member.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await requireAdmin();
    const adminId = session.adminId;
    const { slug } = await params;

    // Look up group by slug
    const group = await groupsQueries.getGroupBySlugForAdmin(slug, adminId);
    if (!group) {
      return NextResponse.json(
        { error: "Group not found or you do not have permission" },
        { status: 404 }
      );
    }

    const players = await playersQueries.getPlayersForGroup(group.id, adminId);

    // Convert Date objects to ISO strings for client compatibility
    const playersForClient = players.map((player) => ({
      id: player.id,
      name: player.name,
      notes: player.notes,
      createdAt: player.createdAt.toISOString(),
    }));

    return NextResponse.json(playersForClient, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/groups/[slug]/players error:", error);
    // If requireAdmin redirects, it will throw a redirect error; we should let it propagate
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/groups/[slug]/players
 * Creates a new player in the group.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await requireAdmin();
    const adminId = session.adminId;
    const { slug } = await params;

    // Look up group by slug
    const group = await groupsQueries.getGroupBySlugForAdmin(slug, adminId);
    if (!group) {
      return NextResponse.json(
        { error: "Group not found or you do not have permission" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, notes } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Player name is required" },
        { status: 400 }
      );
    }

    const newPlayer = await playersQueries.createPlayer(
      {
        name: name.trim(),
        notes: notes?.trim(),
        groupId: group.id,
      },
      adminId
    );

    if (!newPlayer) {
      return NextResponse.json(
        { error: "Failed to create player (permission denied)" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        id: newPlayer.id,
        name: newPlayer.name,
        notes: newPlayer.notes,
        createdAt: newPlayer.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/groups/[slug]/players error:", error);
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/groups/[slug]/players
 * Updates an existing player's name or notes.
 * Player ID must be provided in the request body.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await requireAdmin();
    const adminId = session.adminId;
    const { slug } = await params;

    // Look up group by slug (to ensure admin has access)
    const group = await groupsQueries.getGroupBySlugForAdmin(slug, adminId);
    if (!group) {
      return NextResponse.json(
        { error: "Group not found or you do not have permission" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { id, name, notes } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Player ID is required" },
        { status: 400 }
      );
    }

    const updates: { name?: string; notes?: string | null } = {};
    if (name !== undefined && typeof name === "string") {
      updates.name = name.trim();
    }
    if (notes !== undefined) {
      updates.notes = typeof notes === "string" ? notes.trim() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updated = await playersQueries.updatePlayerForAdmin(
      id,
      adminId,
      updates
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Player not found or you do not have permission" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("PUT /api/admin/groups/[slug]/players error:", error);
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/groups/[slug]/players
 * Deletes a player from the group.
 * Player ID must be provided as a query parameter.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await requireAdmin();
    const adminId = session.adminId;
    const { slug } = await params;

    // Look up group by slug (to ensure admin has access)
    const group = await groupsQueries.getGroupBySlugForAdmin(slug, adminId);
    if (!group) {
      return NextResponse.json(
        { error: "Group not found or you do not have permission" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Player ID is required as query parameter" },
        { status: 400 }
      );
    }

    const deleted = await playersQueries.deletePlayerForAdmin(id, adminId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Player not found or you do not have permission" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/admin/groups/[slug]/players error:", error);
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
