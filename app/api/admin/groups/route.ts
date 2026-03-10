import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import * as groupsQueries from "@/server/db/queries/groups";

/**
 * GET /api/admin/groups
 * Returns all groups where the authenticated admin is a member.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const adminId = session.adminId;

    const groups = await groupsQueries.getGroupsForAdmin(adminId);

    // Convert Date objects to ISO strings for client compatibility
    // Use slug as external ID for backward compatibility
    const groupsForClient = groups.map(group => ({
      id: group.slug,
      name: group.name,
      createdAt: group.createdAt.toISOString(),
    }));

    return NextResponse.json(groupsForClient, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/groups error:", error);
    // If requireAdmin redirects, it will throw a redirect error; we should let it propagate
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/groups
 * Creates a new group and adds the authenticated admin as an admin member.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const adminId = session.adminId;

    const body = await request.json();
    const { id, name } = body;

    if (!id || typeof id !== "string" || !name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Group id and name are required" },
        { status: 400 }
      );
    }

    // Validate id format (slug-like)
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json(
        { error: "Group id must be alphanumeric with hyphens or underscores" },
        { status: 400 }
      );
    }

    const newGroup = await groupsQueries.createGroup({
      id,
      name,
      createdByAdminId: adminId,
    });

    return NextResponse.json(
      {
        id: newGroup.slug,
        name: newGroup.name,
        createdAt: newGroup.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/groups error:", error);
    if (error instanceof Response) throw error;
    // Handle duplicate slug (unique constraint)
    if (error instanceof Error && error.message.includes("duplicate key")) {
      return NextResponse.json(
        { error: "A group with this id already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/groups
 * Updates an existing group (only name for now).
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const adminId = session.adminId;

    const body = await request.json();
    const { id, name } = body;

    if (!id || typeof id !== "string" || !name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Group id and name are required" },
        { status: 400 }
      );
    }

    // Look up group by slug to get UUID
    const group = await groupsQueries.getGroupBySlugForAdmin(id, adminId);
    if (!group) {
      return NextResponse.json(
        { error: "Group not found or you do not have permission" },
        { status: 404 }
      );
    }

    const updated = await groupsQueries.updateGroupForAdmin(group.id, adminId, { name });
    if (!updated) {
      return NextResponse.json(
        { error: "Group not found or you do not have permission" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: updated.slug,
      name: updated.name,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("PUT /api/admin/groups error:", error);
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/groups
 * Deletes a group (cascading) if the authenticated admin is an admin member.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const adminId = session.adminId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Group id is required as query parameter" },
        { status: 400 }
      );
    }

    // Look up group by slug to get UUID
    const group = await groupsQueries.getGroupBySlugForAdmin(id, adminId);
    if (!group) {
      return NextResponse.json(
        { error: "Group not found or you do not have admin permission" },
        { status: 404 }
      );
    }

    const deleted = await groupsQueries.deleteGroupForAdmin(group.id, adminId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Group not found or you do not have admin permission" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/admin/groups error:", error);
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}