import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SharePage from "./page";

import { calculateSettlement } from "@/lib/settlement";
import { getPublicGroupShareDataByToken } from "@/server/db/queries/share-tokens";
import type { PublicGroupShareData } from "@/server/db/queries/share-tokens";

vi.mock("@/server/db/queries/share-tokens", () => ({
  getPublicGroupShareDataByToken: vi.fn(),
}));

const createdAt = new Date("2026-03-13T20:00:00.000Z");

function renderSharePage(token: string) {
  return SharePage({ params: Promise.resolve({ token }) }).then((element) =>
    render(element)
  );
}

describe("public share page", () => {
  it("renders a safe error state for invalid or revoked tokens", async () => {
    vi.mocked(getPublicGroupShareDataByToken).mockResolvedValue(null);

    await renderSharePage("invalid-token");

    expect(getPublicGroupShareDataByToken).toHaveBeenCalledWith(
      "invalid-token"
    );
    expect(screen.getByText("SHARE LINK NOT FOUND")).toBeInTheDocument();
    expect(
      screen.getByText(/invalid, expired, or revoked/i)
    ).toBeInTheDocument();
  });

  it("renders public group data without mutation controls", async () => {
    const settlement = calculateSettlement(
      [
        { userId: "alice", buyIns: 1, finalValue: 1500 },
        { userId: "bob", buyIns: 1, finalValue: 500 },
      ],
      1000
    );
    const data: PublicGroupShareData = {
      group: { name: "Friday Poker", slug: "friday-poker" },
      players: [
        { id: "alice", name: "Alice", createdAt },
        { id: "bob", name: "Bob", createdAt },
      ],
      liveMatch: {
        id: "live-match",
        title: "Current table",
        buyInAmount: 1000,
        status: "live",
        startedAt: createdAt,
        endedAt: null,
        createdAt,
        players: [
          {
            playerId: "alice",
            playerName: "Alice",
            buyIns: 2,
            finalValue: 0,
            cashedOutAt: null,
          },
          {
            playerId: "bob",
            playerName: "Bob",
            buyIns: 1,
            finalValue: 0,
            cashedOutAt: null,
          },
        ],
      },
      settledMatches: [
        {
          id: "settled-match",
          title: "Last week",
          buyInAmount: 1000,
          status: "settled",
          startedAt: createdAt,
          endedAt: createdAt,
          createdAt,
          players: [
            {
              playerId: "alice",
              playerName: "Alice",
              buyIns: 1,
              finalValue: 1500,
              cashedOutAt: null,
            },
            {
              playerId: "bob",
              playerName: "Bob",
              buyIns: 1,
              finalValue: 500,
              cashedOutAt: null,
            },
          ],
          settlement,
        },
      ],
      scoreboard: [
        {
          id: "alice",
          name: "Alice",
          totalNet: 500,
          averageNet: 500,
          matchCount: 1,
        },
        {
          id: "bob",
          name: "Bob",
          totalNet: -500,
          averageNet: -500,
          matchCount: 1,
        },
      ],
    };
    vi.mocked(getPublicGroupShareDataByToken).mockResolvedValue(data);

    await renderSharePage("valid-token");

    expect(
      screen.getByRole("heading", { name: "Friday Poker" })
    ).toBeInTheDocument();
    expect(screen.getByText("READ-ONLY SHARE")).toBeInTheDocument();
    expect(screen.getByText("Current table")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "SCOREBOARD" })
    ).toBeInTheDocument();
    expect(screen.getByText("Last week")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/delete|rebuy|cash out/i)
    ).not.toBeInTheDocument();
  });
});
