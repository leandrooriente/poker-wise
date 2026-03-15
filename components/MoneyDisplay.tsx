import { formatMoney, MoneyFormatOptions } from "@/lib/money";

interface MoneyDisplayProps {
  cents: number;
  options?: MoneyFormatOptions;
  className?: string;
}

export default function MoneyDisplay({
  cents,
  options,
  className,
}: MoneyDisplayProps) {
  return <span className={className}>{formatMoney(cents, options)}</span>;
}
