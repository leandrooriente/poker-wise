import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

import { requireAdmin } from "@/server/auth/session";
import * as groupsQueries from "@/server/db/queries/groups";
import { createGroupShareTokenForAdmin } from "@/server/db/queries/share-tokens";

vi.mock("@/server/auth/session", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/server/db/queries/groups", () => ({
  getGroupBySlugForAdmin: vi.fn(),
}));

vi.mock("@/server/db/queries/share-tokens", () => ({
  createGroupShareTokenForAdmin: vi.fn(),
  revokeGroupShareTokenForAdmin: vi.fn(),
}));

function shareRequest() {
  return new NextRequest(
    "https://poker.example.com/api/admin/groups/friday/share",
    {
      method: "POST",
    }
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/groups/[slug]/share", () => {
  it("creates a public share URL for an admin-managed group", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ adminId: "admin-1" } as any);
    vi.mocked(groupsQueries.getGroupBySlugForAdmin).mockResolvedValue({
      id: "group-1",
      slug: "friday",
      name: "Friday Poker",
    } as any);
    vi.mocked(createGroupShareTokenForAdmin).mockResolvedValue({
      tokenId: "token-1",
      rawToken: "raw_token",
      createdAt: new Date("2026-03-13T20:00:00.000Z"),
    });

    const response = await POST(shareRequest(), {
      params: Promise.resolve({ slug: "friday" }),
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(createGroupShareTokenForAdmin).toHaveBeenCalledWith(
      "group-1",
      "admin-1"
    );
    expect(body).toEqual({
      tokenId: "token-1",
      shareUrl: "https://poker.example.com/share/raw_token",
      createdAt: "2026-03-13T20:00:00.000Z",
    });
    expect(body).not.toHaveProperty("tokenHash");
    expect(body).not.toHaveProperty("rawToken");
  });

  it("does not create links for groups the admin cannot access", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ adminId: "admin-1" } as any);
    vi.mocked(groupsQueries.getGroupBySlugForAdmin).mockResolvedValue(
      undefined
    );

    const response = await POST(shareRequest(), {
      params: Promise.resolve({ slug: "missing" }),
    });

    expect(response.status).toBe(404);
    expect(createGroupShareTokenForAdmin).not.toHaveBeenCalled();
  });
});
