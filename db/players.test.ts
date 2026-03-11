// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { getPlayersForGroup } from "./players";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("getPlayersForGroup", () => {
  it("falls back to current localStorage users and memberships", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    localStorage.setItem(
      "poker-wise-users",
      JSON.stringify([
        { id: "p1", name: "Alice", createdAt: "2026-03-11T00:00:00.000Z" },
        { id: "p2", name: "Bob", createdAt: "2026-03-11T00:00:00.000Z" },
      ])
    );
    localStorage.setItem(
      "poker-wise-group-members",
      JSON.stringify([
        { groupId: "g1", userId: "p1", joinedAt: "2026-03-11T00:00:00.000Z" },
        { groupId: "g2", userId: "p2", joinedAt: "2026-03-11T00:00:00.000Z" },
      ])
    );

    await expect(getPlayersForGroup("g1")).resolves.toEqual([
      { id: "p1", name: "Alice", createdAt: "2026-03-11T00:00:00.000Z" },
    ]);
  });

  it("does not depend on legacy player storage", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    localStorage.setItem("poker-wise-users", JSON.stringify([]));
    localStorage.setItem(
      "poker-wise-group-members",
      JSON.stringify([
        { groupId: "g1", userId: "p1", joinedAt: "2026-03-11T00:00:00.000Z" },
      ])
    );
    localStorage.setItem(
      "poker-wise-players",
      JSON.stringify([
        {
          id: "p1",
          name: "Legacy Alice",
          createdAt: "2026-03-11T00:00:00.000Z",
        },
      ])
    );

    await expect(getPlayersForGroup("g1")).resolves.toEqual([]);
  });
});
