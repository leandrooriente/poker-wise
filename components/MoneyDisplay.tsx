import { formatMoney, MoneyFormatOptions } from "@/lib/money";

interface MoneyDisplayProps {
  /** Amount in cents */
  cents: number;
  /** Formatting options */
  options?: MoneyFormatOptions;
  /** Additional CSS classes */
  className?: string;
  /** Optional data-testid for testing */
  "data-testid"?: string;
  /** Optional style prop */
  style?: React.CSSProperties;
}

/**
 * Display a monetary amount with consistent formatting.
 * Defaults to "0.00 EUR" format, no leading '+' for positives.
 */
export default function MoneyDisplay({
  cents,
  options,
  className,
  "data-testid": testId,
  style,
}: MoneyDisplayProps) {
  const formatted = formatMoney(cents, options);
  return (
    <span className={className} data-testid={testId} style={style}>
      {formatted}
    </span>
  );
}
