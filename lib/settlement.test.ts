import { describe, it, expect } from "vitest";

import { calculateSettlement, validateTotals, formatCents, formatSettlementShareText } from "./settlement";

import type { MatchPlayer } from "@/types/match";

describe("settlement", () => {
  const buyInAmount = 1000; // 10.00 EUR in cents

  describe("validateTotals", () => {
    it("returns valid when totals match", () => {
      const players: MatchPlayer[] = [
        { userId: "1", buyIns: 2, finalValue: 2000 },
        { userId: "2", buyIns: 1, finalValue: 1000 },
      ];
      const result = validateTotals(players, buyInAmount);
      expect(result.isValid).toBe(true);
      expect(result.diff).toBe(0);
      expect(result.totalPaidIn).toBe(3000);
      expect(result.totalFinalValue).toBe(3000);
    });

    it("returns invalid when totals mismatch", () => {
      const players: MatchPlayer[] = [
        { userId: "1", buyIns: 2, finalValue: 2500 },
        { userId: "2", buyIns: 1, finalValue: 1000 },
      ];
      const result = validateTotals(players, buyInAmount);
      expect(result.isValid).toBe(false);
      expect(result.diff).toBe(500);
    });
  });

  describe("calculateSettlement", () => {
    it("calculates correct balances and transfers", () => {
      const players: MatchPlayer[] = [
        { userId: "max", buyIns: 2, finalValue: 1400 },
        { userId: "ana", buyIns: 1, finalValue: 1600 },
      ];
      const result = calculateSettlement(players, buyInAmount);

      expect(result.isValid).toBe(true);
      expect(result.totalPaidIn).toBe(3000);
      expect(result.totalFinalValue).toBe(3000);

       const max = result.playerBalances.find((b) => b.userId === "max");
       const ana = result.playerBalances.find((b) => b.userId === "ana");

      expect(max?.paidIn).toBe(2000);
      expect(max?.finalValue).toBe(1400);
      expect(max?.net).toBe(-600);

      expect(ana?.paidIn).toBe(1000);
      expect(ana?.finalValue).toBe(1600);
      expect(ana?.net).toBe(600);

      expect(result.transfers).toHaveLength(1);
      expect(result.transfers[0]).toEqual({
        fromPlayerId: "max",
        toPlayerId: "ana",
        amount: 600,
        description: "6.00 EUR",
      });
    });

    it("handles multiple debtors and creditors with minimized transfers", () => {
       const players: MatchPlayer[] = [
        { userId: "a", buyIns: 1, finalValue: 500 },  // owes 500
        { userId: "b", buyIns: 1, finalValue: 1500 }, // owed 500
        { userId: "c", buyIns: 2, finalValue: 1000 }, // owes 1000
        { userId: "d", buyIns: 1, finalValue: 2000 }, // owed 1000
      ];
      const result = calculateSettlement(players, buyInAmount);

      expect(result.isValid).toBe(true);
      expect(result.transfers).toHaveLength(2);

      // Expect a→b 500, c→d 1000 (or other combination, but minimized)
      const transferAB = result.transfers.find(
        (t) => t.fromPlayerId === "a" && t.toPlayerId === "b"
      );
      const transferCD = result.transfers.find(
        (t) => t.fromPlayerId === "c" && t.toPlayerId === "d"
      );

      expect(transferAB?.amount).toBe(500);
      expect(transferCD?.amount).toBe(1000);
    });

    it("returns error when totals do not match", () => {
       const players: MatchPlayer[] = [
        { userId: "1", buyIns: 1, finalValue: 1200 },
        { userId: "2", buyIns: 1, finalValue: 900 },
      ];
      const result = calculateSettlement(players, buyInAmount);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("does not match");
      expect(result.transfers).toHaveLength(0);
    });

    it("handles zero‑net player (no transfers)", () => {
       const players: MatchPlayer[] = [
        { userId: "1", buyIns: 2, finalValue: 2000 },
        { userId: "2", buyIns: 1, finalValue: 1000 },
        { userId: "3", buyIns: 1, finalValue: 1000 },
      ];
      const result = calculateSettlement(players, buyInAmount);
      expect(result.isValid).toBe(true);
      expect(result.transfers).toHaveLength(0);
    });
  });

  describe("formatCents", () => {
    it("formats cents to euros with two decimals", () => {
      expect(formatCents(1000)).toBe("10.00 EUR");
      expect(formatCents(1234)).toBe("12.34 EUR");
      expect(formatCents(0)).toBe("0.00 EUR");
      expect(formatCents(-500)).toBe("-5.00 EUR");
    });
  });

  describe("formatSettlementShareText", () => {
    it("formats three-player mixed outcome with transfers", () => {
      const createdAt = "2026-03-13T20:00:00.000Z";
      const buyInAmount = 1000;
      const matchPlayers: MatchPlayer[] = [
        { userId: "a", buyIns: 1, finalValue: 2500 }, // Alice: 1 buy-in, net +15 => finalValue = paidIn + 15 = 10 + 15 = 25 EUR => 2500 cents
        { userId: "c", buyIns: 1, finalValue: 500 },  // Charlie: 1 buy-in, net -5 => finalValue = 10 - 5 = 5 EUR => 500 cents
        { userId: "b", buyIns: 2, finalValue: 1000 }, // Bob: 2 buy-ins, net -10 => paidIn 20, finalValue = 20 - 10 = 10 EUR => 1000 cents
      ];
      const players = [
        { id: "a", name: "Alice" },
        { id: "b", name: "Bob" },
        { id: "c", name: "Charlie" },
      ];
      const settlement = calculateSettlement(matchPlayers, buyInAmount);
      const text = formatSettlementShareText({
        createdAt,
        matchPlayers,
        players,
        settlement,
      });
      expect(text).toBe(`13 Mar 2026

Results:
1. Alice: +15.00 EUR (1 buy-in)
2. Charlie: -5.00 EUR (1 buy-in)
3. Bob: -10.00 EUR (2 buy-ins)

Transfers:
Bob -> Alice: 10.00 EUR
Charlie -> Alice: 5.00 EUR`);
    });

    it("formats break-even match with no transfers", () => {
      const createdAt = "2026-03-14T12:00:00.000Z";
      const matchPlayers: MatchPlayer[] = [
        { userId: "a", buyIns: 1, finalValue: 1000 },
        { userId: "b", buyIns: 1, finalValue: 1000 },
      ];
      const players = [
        { id: "a", name: "Alice" },
        { id: "b", name: "Bob" },
      ];
      const settlement = calculateSettlement(matchPlayers, 1000);
      const text = formatSettlementShareText({
        createdAt,
        matchPlayers,
        players,
        settlement,
      });
      expect(text).toBe(`14 Mar 2026

Results:
1. Alice: 0.00 EUR (1 buy-in)
2. Bob: 0.00 EUR (1 buy-in)

Transfers:
No transfers needed.`);
    });

    it("sorts by highest net first, preserving order on tie", () => {
      const createdAt = "2026-03-15T12:00:00.000Z";
      const matchPlayers: MatchPlayer[] = [
        { userId: "a", buyIns: 1, finalValue: 2000 }, // +10
        { userId: "b", buyIns: 1, finalValue: 0 },    // -10
        { userId: "c", buyIns: 1, finalValue: 2000 }, // +10 tie
      ];
      const players = [
        { id: "a", name: "Alice" },
        { id: "b", name: "Bob" },
        { id: "c", name: "Charlie" },
      ];
      const settlement = calculateSettlement(matchPlayers, 1000);
      const text = formatSettlementShareText({
        createdAt,
        matchPlayers,
        players,
        settlement,
      });
      // Both Alice and Charlie have +10, Bob -10.
      // Should list Alice first (original order), then Charlie, then Bob.
      // Actually sorting by net descending: +10, +10, -10.
      // Tie-breaking: preserve original order.
      const lines = text.split("\n");
      // Find results lines
      const resultsStart = lines.findIndex(l => l.startsWith("Results:")) + 1;
      const resultLines = lines.slice(resultsStart, resultsStart + 3).filter(l => l.trim() !== "");
      expect(resultLines[0]).toContain("Alice");
      expect(resultLines[1]).toContain("Charlie");
      expect(resultLines[2]).toContain("Bob");
    });
  });
});