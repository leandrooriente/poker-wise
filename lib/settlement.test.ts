import { describe, it, expect } from "vitest";

import { calculateSettlement, validateTotals, formatCents } from "./settlement";

import type { MatchPlayer } from "@/types/match";

describe("settlement", () => {
  const buyInAmount = 1000; // 10.00 EUR in cents

  describe("validateTotals", () => {
    it("returns valid when totals match", () => {
      const players: MatchPlayer[] = [
        { playerId: "1", buyIns: 2, finalValue: 2000 },
        { playerId: "2", buyIns: 1, finalValue: 1000 },
      ];
      const result = validateTotals(players, buyInAmount);
      expect(result.isValid).toBe(true);
      expect(result.diff).toBe(0);
      expect(result.totalPaidIn).toBe(3000);
      expect(result.totalFinalValue).toBe(3000);
    });

    it("returns invalid when totals mismatch", () => {
      const players: MatchPlayer[] = [
        { playerId: "1", buyIns: 2, finalValue: 2500 },
        { playerId: "2", buyIns: 1, finalValue: 1000 },
      ];
      const result = validateTotals(players, buyInAmount);
      expect(result.isValid).toBe(false);
      expect(result.diff).toBe(500);
    });
  });

  describe("calculateSettlement", () => {
    it("calculates correct balances and transfers", () => {
      const players: MatchPlayer[] = [
        { playerId: "max", buyIns: 2, finalValue: 1400 },
        { playerId: "ana", buyIns: 1, finalValue: 1600 },
      ];
      const result = calculateSettlement(players, buyInAmount);

      expect(result.isValid).toBe(true);
      expect(result.totalPaidIn).toBe(3000);
      expect(result.totalFinalValue).toBe(3000);

      const max = result.playerBalances.find((b) => b.playerId === "max");
      const ana = result.playerBalances.find((b) => b.playerId === "ana");

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
        { playerId: "a", buyIns: 1, finalValue: 500 },  // owes 500
        { playerId: "b", buyIns: 1, finalValue: 1500 }, // owed 500
        { playerId: "c", buyIns: 2, finalValue: 1000 }, // owes 1000
        { playerId: "d", buyIns: 1, finalValue: 2000 }, // owed 1000
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
        { playerId: "1", buyIns: 1, finalValue: 1200 },
        { playerId: "2", buyIns: 1, finalValue: 900 },
      ];
      const result = calculateSettlement(players, buyInAmount);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("does not match");
      expect(result.transfers).toHaveLength(0);
    });

    it("handles zero‑net player (no transfers)", () => {
      const players: MatchPlayer[] = [
        { playerId: "1", buyIns: 2, finalValue: 2000 },
        { playerId: "2", buyIns: 1, finalValue: 1000 },
        { playerId: "3", buyIns: 1, finalValue: 1000 },
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
});