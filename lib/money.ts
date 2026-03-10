/**
 * Money formatting and parsing utilities for Poker Wise.
 * All monetary values are stored as integer cents.
 */

export interface MoneyFormatOptions {
  /** Include the currency suffix (default: true) */
  currency?: boolean;
  /** Show a leading '+' for positive amounts (default: false) */
  showPlus?: boolean;
  /** Minimum fraction digits (default: 2) */
  minimumFractionDigits?: number;
  /** Maximum fraction digits (default: 2) */
  maximumFractionDigits?: number;
}

/**
 * Format cents as a display string.
 * Example: 1234 -> "12.34 EUR"
 */
export function formatMoney(
  cents: number,
  options: MoneyFormatOptions = {}
): string {
  const {
    currency = true,
    showPlus = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  const amount = cents / 100;
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping: false,
  });

  let sign = '';
  if (amount < 0) {
    sign = '-';
  } else if (showPlus && amount > 0) {
    sign = '+';
  }

  return `${sign}${formatted}${currency ? ' EUR' : ''}`;
}

/**
 * Format cents for an editable input field (no currency suffix).
 * Example: 1234 -> "12.34"
 */
export function formatMoneyForInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Parse a display string or raw numeric string into cents.
 * Handles decimal numbers with optional currency suffix.
 * Returns 0 for empty/invalid input.
 */
export function parseMoneyInput(input: string): number {
  if (!input || input.trim() === '') {
    return 0;
  }

  // Remove currency suffix if present
  const cleaned = input.replace(/ EUR$/i, '').trim();

  // Validate format: optional minus, digits, optional decimal point with digits
  // Rejects multiple decimal points, empty, non‑numeric characters
  if (!/^-?\d*\.?\d+$/.test(cleaned)) {
    return 0;
  }

  // Parse as float
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    return 0;
  }

  // Convert to cents, rounding to avoid floating point errors
  return Math.round(parsed * 100);
}

/**
 * Handle digit‑entry for a money input field.
 * Given the current raw digits (string of digits) and a new digit typed,
 * returns the new raw digits (limited to maxDigits).
 * If backspace is true, removes the last digit instead.
 */
export function handleMoneyDigitEntry(
  currentDigits: string,
  digit: string | null,
  maxDigits: number = 10
): string {
  if (digit === null) {
    // Backspace/delete: remove last digit
    const afterBackspace = currentDigits.slice(0, -1);
    return afterBackspace === '' ? '0' : afterBackspace;
  }

  // Ensure digit is a single digit character
  if (!/^\d$/.test(digit)) {
    return currentDigits;
  }

  // Keep at most (maxDigits-1) existing digits, append new digit,
  // then ensure total length ≤ maxDigits (slice again as safety)
  const truncated = currentDigits.slice(-(maxDigits - 1));
  const newDigits = (truncated + digit).slice(-maxDigits);
  
  // Remove leading zeros (but keep at least one digit if we have some)
  const trimmed = newDigits.replace(/^0+/, '');
  return trimmed === '' ? '0' : trimmed;
}

/**
 * Convert raw digits string to cents.
 * Example: "1234" -> 1234 cents (12.34 EUR)
 */
export function digitsToCents(digits: string): number {
  return parseInt(digits || '0', 10);
}

/**
 * Convert cents to raw digits string (no decimal point).
 * Example: 1234 -> "1234"
 */
export function centsToDigits(cents: number): string {
  return Math.abs(cents).toString();
}

/**
 * Format raw digits for display with decimal point.
 * Example: "1234" -> "12.34"
 */
export function formatDigitsForDisplay(digits: string): string {
  const num = parseInt(digits || '0', 10);
  return (num / 100).toFixed(2);
}