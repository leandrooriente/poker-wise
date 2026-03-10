import { describe, it, expect } from "vitest";

import {
  formatMoney,
  formatMoneyForInput,
  parseMoneyInput,
  handleMoneyDigitEntry,
  digitsToCents,
  centsToDigits,
  formatDigitsForDisplay,
} from "./money";

describe("money utilities", () => {
  describe("formatMoney", () => {
    it("formats cents with default options", () => {
      expect(formatMoney(0)).toBe("0.00 EUR");
      expect(formatMoney(1234)).toBe("12.34 EUR");
      expect(formatMoney(-5678)).toBe("-56.78 EUR");
    });

    it("formats without currency suffix", () => {
      expect(formatMoney(1234, { currency: false })).toBe("12.34");
      expect(formatMoney(-5678, { currency: false })).toBe("-56.78");
    });

    it("shows plus sign for positive amounts when requested", () => {
      expect(formatMoney(1234, { showPlus: true })).toBe("+12.34 EUR");
      expect(formatMoney(0, { showPlus: true })).toBe("0.00 EUR");
      expect(formatMoney(-5678, { showPlus: true })).toBe("-56.78 EUR");
    });

    it("respects fraction digit options", () => {
      expect(formatMoney(123456, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe("1234.56 EUR");
      expect(formatMoney(100, { minimumFractionDigits: 0, maximumFractionDigits: 0 })).toBe("1 EUR");
      expect(formatMoney(150, { minimumFractionDigits: 0, maximumFractionDigits: 0 })).toBe("2 EUR"); // rounding
    });
  });

  describe("formatMoneyForInput", () => {
    it("formats cents as decimal string without currency", () => {
      expect(formatMoneyForInput(0)).toBe("0.00");
      expect(formatMoneyForInput(1234)).toBe("12.34");
      expect(formatMoneyForInput(-5678)).toBe("-56.78");
    });
  });

  describe("parseMoneyInput", () => {
    it("parses decimal strings with currency suffix", () => {
      expect(parseMoneyInput("12.34 EUR")).toBe(1234);
      expect(parseMoneyInput("12.34")).toBe(1234);
      expect(parseMoneyInput("0.00 EUR")).toBe(0);
      expect(parseMoneyInput("-56.78")).toBe(-5678);
    });

    it("handles empty/invalid input", () => {
      expect(parseMoneyInput("")).toBe(0);
      expect(parseMoneyInput("   ")).toBe(0);
      expect(parseMoneyInput("abc")).toBe(0);
      expect(parseMoneyInput("12.34.56")).toBe(0); // invalid
    });

    it("rounds to nearest cent", () => {
      expect(parseMoneyInput("12.345")).toBe(1235); // rounding up
      expect(parseMoneyInput("12.344")).toBe(1234); // rounding down
    });
  });

  describe("digit handling", () => {
    describe("handleMoneyDigitEntry", () => {
      it("appends digits", () => {
        expect(handleMoneyDigitEntry("", "1")).toBe("1");
        expect(handleMoneyDigitEntry("1", "2")).toBe("12");
        expect(handleMoneyDigitEntry("12", "3")).toBe("123");
      });

      it("limits max digits", () => {
        expect(handleMoneyDigitEntry("1234567890", "1", 10)).toBe("2345678901"); // shift out first digit
        expect(handleMoneyDigitEntry("1234567890", "1", 5)).toBe("78901"); // keep only last 5
      });

      it("handles backspace (digit = null)", () => {
        expect(handleMoneyDigitEntry("123", null)).toBe("12");
        expect(handleMoneyDigitEntry("1", null)).toBe("0");
        expect(handleMoneyDigitEntry("0", null)).toBe("0"); // cannot go below zero
      });

      it("removes leading zeros", () => {
        expect(handleMoneyDigitEntry("0", "1")).toBe("1");
        expect(handleMoneyDigitEntry("00123", "4")).toBe("1234");
      });

      it("rejects non‑digit characters", () => {
        expect(handleMoneyDigitEntry("12", "a")).toBe("12");
        expect(handleMoneyDigitEntry("12", ".")).toBe("12");
        expect(handleMoneyDigitEntry("12", "")).toBe("12");
      });
    });

    describe("digitsToCents", () => {
      it("converts digit string to cents", () => {
        expect(digitsToCents("0")).toBe(0);
        expect(digitsToCents("1234")).toBe(1234);
        expect(digitsToCents("00100")).toBe(100);
      });
    });

    describe("centsToDigits", () => {
      it("converts cents to digit string (absolute)", () => {
        expect(centsToDigits(0)).toBe("0");
        expect(centsToDigits(1234)).toBe("1234");
        expect(centsToDigits(-5678)).toBe("5678");
      });
    });

    describe("formatDigitsForDisplay", () => {
      it("formats digit string with decimal point", () => {
        expect(formatDigitsForDisplay("0")).toBe("0.00");
        expect(formatDigitsForDisplay("1234")).toBe("12.34");
        expect(formatDigitsForDisplay("00100")).toBe("1.00");
      });
    });
  });

  describe("integration: digit‑entry flow", () => {
    it("simulates typing 1, 2, 3, backspace", () => {
      let digits = "";
      digits = handleMoneyDigitEntry(digits, "1");
      expect(digits).toBe("1");
      expect(digitsToCents(digits)).toBe(1); // 0.01 EUR
      expect(formatDigitsForDisplay(digits)).toBe("0.01");

      digits = handleMoneyDigitEntry(digits, "2");
      expect(digits).toBe("12");
      expect(digitsToCents(digits)).toBe(12); // 0.12 EUR
      expect(formatDigitsForDisplay(digits)).toBe("0.12");

      digits = handleMoneyDigitEntry(digits, "3");
      expect(digits).toBe("123");
      expect(digitsToCents(digits)).toBe(123); // 1.23 EUR
      expect(formatDigitsForDisplay(digits)).toBe("1.23");

      digits = handleMoneyDigitEntry(digits, null); // backspace
      expect(digits).toBe("12");
      expect(digitsToCents(digits)).toBe(12);
      expect(formatDigitsForDisplay(digits)).toBe("0.12");
    });

    it("handles multiple digits leading to larger amounts", () => {
      let digits = "";
      digits = handleMoneyDigitEntry(digits, "9");
      digits = handleMoneyDigitEntry(digits, "8");
      digits = handleMoneyDigitEntry(digits, "0");
      expect(digits).toBe("980");
      expect(formatDigitsForDisplay(digits)).toBe("9.80");
    });
  });
});