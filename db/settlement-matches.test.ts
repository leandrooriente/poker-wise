// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { getMatchWithUsers, settleMatch } from "./matches";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("settlement match wrappers", () => {
  it("settles a match through the admin settle endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          match: {
            id: "match-1",
            groupId: "group-1",
            buyInAmount: 1000,
            status: "settled",
            players: [
              { userId: "p1", buyIns: 1, finalValue: 1200 },
              { userId: "p2", buyIns: 1, finalValue: 800 },
            ],
            createdAt: "2026-03-11T00:00:00.000Z",
            startedAt: "2026-03-11T00:00:00.000Z",
            endedAt: "2026-03-11T01:00:00.000Z",
          },
          players: [],
          settlement: { isValid: true, totalPot: 2000, transfers: [] },
        }),
      })
    );

    await expect(
      settleMatch("match-1", {
        p1: 1200,
        p2: 800,
      })
    ).resolves.toMatchObject({
      match: { id: "match-1", status: "settled" },
      settlement: { totalPot: 2000 },
    });

    expect(fetch).toHaveBeenCalledWith("/api/admin/matches/match-1/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ finalValues: { p1: 1200, p2: 800 } }),
    });
  });

  it("returns settlement data when loading a settled match", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          match: {
            id: "match-1",
            groupId: "group-1",
            buyInAmount: 1000,
            status: "settled",
            players: [
              { userId: "p1", buyIns: 1, finalValue: 1200 },
              { userId: "p2", buyIns: 1, finalValue: 800 },
            ],
            createdAt: "2026-03-11T00:00:00.000Z",
            startedAt: "2026-03-11T00:00:00.000Z",
            endedAt: "2026-03-11T01:00:00.000Z",
          },
          players: [
            {
              user: {
                id: "p1",
                name: "Alice",
                createdAt: "2026-03-11T00:00:00.000Z",
              },
              buyIns: 1,
              finalValue: 1200,
            },
          ],
          settlement: {
            isValid: true,
            totalPot: 2000,
            totalPaidIn: 2000,
            totalFinalValue: 2000,
            transfers: [],
            playerBalances: [],
          },
        }),
      })
    );

    await expect(getMatchWithUsers("match-1")).resolves.toMatchObject({
      match: { id: "match-1", status: "settled" },
      settlement: { totalFinalValue: 2000 },
    });
  });
});
