import { describe, expect, it } from "vitest";

import { Match } from "../types/match";
import { Player } from "../types/player";

import { buildScoreRows } from "./score";

const players: Player[] = [
  { id: "paulo", name: "Paulo", createdAt: "2026-03-01T00:00:00.000Z" },
  { id: "pedro", name: "Pedro", createdAt: "2026-03-01T00:00:00.000Z" },
  { id: "john", name: "John", createdAt: "2026-03-01T00:00:00.000Z" },
];

function createSettledMatch(
  id: string,
  values: Array<{ userId: string; finalValue: number }>,
  buyInAmount: number = 1000
): Match {
  return {
    id,
    groupId: "group-1",
    status: "settled",
    createdAt: "2026-03-10T00:00:00.000Z",
    buyInAmount,
    players: values.map((value) => ({
      userId: value.userId,
      buyIns: 1,
      finalValue: value.finalValue,
    })),
  };
}

describe("buildScoreRows", () => {
  it("aggregates only settled matches and computes totals and averages", () => {
    const matches: Match[] = [
      createSettledMatch("m1", [
        { userId: "paulo", finalValue: 2500 },
        { userId: "john", finalValue: 500 },
      ]),
      createSettledMatch("m2", [
        { userId: "paulo", finalValue: 500 },
        { userId: "pedro", finalValue: 1500 },
      ]),
      createSettledMatch("m3", [
        { userId: "pedro", finalValue: 2500 },
        { userId: "john", finalValue: 500 },
      ]),
      {
        id: "live-1",
        groupId: "group-1",
        status: "live",
        createdAt: "2026-03-11T00:00:00.000Z",
        buyInAmount: 1000,
        players: [
          { userId: "pedro", buyIns: 1, finalValue: 5000 },
          { userId: "john", buyIns: 1, finalValue: 0 },
        ],
      },
    ];

    const rows = buildScoreRows(matches, players);

    expect(rows).toEqual([
      {
        id: "pedro",
        name: "Pedro",
        totalNet: 2000,
        averageNet: 1000,
        matchCount: 2,
      },
      {
        id: "paulo",
        name: "Paulo",
        totalNet: 1000,
        averageNet: 500,
        matchCount: 2,
      },
      {
        id: "john",
        name: "John",
        totalNet: -1000,
        averageNet: -500,
        matchCount: 2,
      },
    ]);
  });

  it("ignores players that never appeared in settled matches", () => {
    const rows = buildScoreRows(
      [
        createSettledMatch("m1", [
          { userId: "paulo", finalValue: 2000 },
          { userId: "john", finalValue: 0 },
        ]),
      ],
      [...players, { id: "extra", name: "Ghost", createdAt: "2026-03-01T00:00:00.000Z" }]
    );

    expect(rows.map((row) => row.id)).toEqual(["paulo", "john"]);
  });
});
