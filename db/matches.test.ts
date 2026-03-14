// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addMatch,
  getMatchWithUsers,
  getMatchesByGroup,
  updateMatch,
  deleteMatch,
} from "./matches";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("matches API wrapper", () => {
  it("creates matches through the admin group endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "match-1",
          groupId: "test-group",
          title: "Friday",
          buyInAmount: 1000,
          players: [{ userId: "p1", buyIns: 1, finalValue: 0 }],
          createdAt: "2026-03-11T00:00:00.000Z",
          startedAt: "2026-03-11T00:00:00.000Z",
          endedAt: null,
          status: "live",
        }),
      })
    );

    await expect(
      addMatch({
        groupId: "test-group",
        title: "Friday",
        buyInAmount: 1000,
        players: [{ userId: "p1", buyIns: 1, finalValue: 0 }],
        startedAt: "2026-03-11T00:00:00.000Z",
      })
    ).resolves.toMatchObject({ id: "match-1", groupId: "test-group" });

    expect(fetch).toHaveBeenCalledWith("/api/admin/groups/test-group/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: "Friday",
        buyInAmount: 1000,
        players: [{ userId: "p1", buyIns: 1, finalValue: 0 }],
        startedAt: "2026-03-11T00:00:00.000Z",
      }),
    });
  });

  it("loads a match with players from the admin match endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          match: {
            id: "match-1",
            groupId: "test-group",
            buyInAmount: 1000,
            players: [{ userId: "p1", buyIns: 2, finalValue: 0 }],
            createdAt: "2026-03-11T00:00:00.000Z",
            startedAt: "2026-03-11T00:00:00.000Z",
          },
          players: [
            {
              user: {
                id: "p1",
                name: "Alice",
                createdAt: "2026-03-11T00:00:00.000Z",
              },
              buyIns: 2,
              finalValue: 0,
            },
          ],
        }),
      })
    );

    await expect(getMatchWithUsers("match-1")).resolves.toMatchObject({
      match: { id: "match-1" },
      players: [{ user: { name: "Alice" }, buyIns: 2 }],
    });

    expect(fetch).toHaveBeenCalledWith("/api/admin/matches/match-1", {
      credentials: "include",
    });
  });

  it("lists matches for a group through the backend before falling back", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "match-1",
            groupId: "test-group",
            buyInAmount: 1000,
            players: [{ userId: "p1", buyIns: 1, finalValue: 0 }],
            createdAt: "2026-03-11T00:00:00.000Z",
            startedAt: "2026-03-11T00:00:00.000Z",
          },
        ],
      })
    );

    await expect(getMatchesByGroup("test-group")).resolves.toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith("/api/admin/groups/test-group/matches", {
      credentials: "include",
    });
  });

  it("updates matches through the admin match endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })
    );

    await expect(
      updateMatch({
        id: "match-1",
        groupId: "test-group",
        buyInAmount: 1000,
        players: [{ userId: "p1", buyIns: 2, finalValue: 0 }],
        createdAt: "2026-03-11T00:00:00.000Z",
        startedAt: "2026-03-11T00:00:00.000Z",
      })
    ).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledWith("/api/admin/matches/match-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        groupId: "test-group",
        buyInAmount: 1000,
        players: [{ userId: "p1", buyIns: 2, finalValue: 0 }],
        createdAt: "2026-03-11T00:00:00.000Z",
        startedAt: "2026-03-11T00:00:00.000Z",
      }),
    });
  });

  it("deletes a match through the admin match endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })
    );

    await expect(deleteMatch("match-1")).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledWith("/api/admin/matches/match-1", {
      method: "DELETE",
      credentials: "include",
    });
  });
});
