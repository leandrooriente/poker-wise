"use client";

import { useState, useRef, KeyboardEvent, ChangeEvent, useMemo } from "react";

import {
  formatMoneyForInput,
  parseMoneyInput,
  handleMoneyDigitEntry,
  digitsToCents,
  centsToDigits,
  formatDigitsForDisplay,
} from "@/lib/money";

interface MoneyInputProps {
  /** Current value in cents */
  value: number;
  /** Callback when value changes */
  onChange: (cents: number) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Maximum number of digits allowed (default 10 = up to 9,999,999.99) */
  maxDigits?: number;
  /** Optional id for label association */
  id?: string;
  /** Optional data-testid for testing */
  "data-testid"?: string;
}

/**
 * Money input with digit-entry behavior:
 * - Typing digits shifts cents from right to left (e.g., 1 → 0.01, 980 → 9.80)
 * - Backspace/delete/arrows/tab behave normally
 * - Empty visual state shows "0.00"
 */
export default function MoneyInput({
  value,
  onChange,
  placeholder = "0.00",
  maxDigits = 10,
  id,
  "data-testid": testId,
}: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [internalRawDigits, setInternalRawDigits] = useState<string>(() =>
    centsToDigits(value)
  );

  // Derived raw digits: when focused use internal, otherwise compute from value
  const rawDigits = isFocused ? internalRawDigits : centsToDigits(value);

  // Display value
  const displayValue = useMemo(
    () =>
      isFocused
        ? formatDigitsForDisplay(rawDigits)
        : formatMoneyForInput(value),
    [isFocused, rawDigits, value]
  );

  const handleFocus = () => {
    setIsFocused(true);
    // Sync internal raw digits with current value
    setInternalRawDigits(centsToDigits(value));
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Commit any pending changes
    const cents = digitsToCents(internalRawDigits);
    if (cents !== value) {
      onChange(cents);
    }
  };

  const updateDigits = (newDigits: string) => {
    setInternalRawDigits(newDigits);
    onChange(digitsToCents(newDigits));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Handle digit keys
    if (e.key >= "0" && e.key <= "9" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const newDigits = handleMoneyDigitEntry(rawDigits, e.key, maxDigits);
      updateDigits(newDigits);
      return;
    }

    // Handle backspace & delete
    if (
      (e.key === "Backspace" || e.key === "Delete") &&
      !e.ctrlKey &&
      !e.metaKey
    ) {
      e.preventDefault();
      const newDigits = handleMoneyDigitEntry(rawDigits, null, maxDigits);
      updateDigits(newDigits);
      return;
    }

    // Allow navigation keys, tab, escape, enter, etc.
    // Let the browser handle them normally.
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    // Try to parse as a monetary value
    const cents = parseMoneyInput(pasted);
    if (cents !== 0 || pasted.trim() === "" || /^0*$/.test(pasted)) {
      const digits = centsToDigits(cents);
      // Ensure digit limit
      const limited = digits.slice(0, maxDigits);
      updateDigits(limited);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Fallback for direct edits (e.g., typing a decimal point, clearing)
    // Parse the displayed value
    const cents = parseMoneyInput(e.target.value);
    const digits = centsToDigits(cents);
    updateDigits(digits);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      id={id}
      value={displayValue}
      placeholder={placeholder}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className="nes-input"
      data-testid={testId}
    />
  );
}
