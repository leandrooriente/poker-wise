import { formatMoney } from "./money";

import { MatchPlayer, SettlementTransfer } from "@/types/match";

export interface PlayerBalance {
  userId: string; // renamed from playerId to match MatchPlayer.userId
  paidIn: number; // cents
  finalValue: number; // cents
  net: number; // cents: finalValue - paidIn
}

export interface SettlementResult {
  playerBalances: PlayerBalance[];
  totalPot: number; // cents
  totalPaidIn: number;
  totalFinalValue: number;
  isValid: boolean;
  error?: string;
  transfers: SettlementTransfer[];
}

/**
 * Calculate settlement for a match.
 * @param players MatchPlayer list with buyIns and finalValue
 * @param buyInAmount per buy-in in cents
 */
export function calculateSettlement(
  players: MatchPlayer[],
  buyInAmount: number
): SettlementResult {
  // Compute per‑player balances
  const playerBalances: PlayerBalance[] = players.map((p) => {
    const paidIn = p.buyIns * buyInAmount;
    const net = p.finalValue - paidIn;
    return { userId: p.userId, paidIn, finalValue: p.finalValue, net };
  });

  const totalPaidIn = playerBalances.reduce((sum, b) => sum + b.paidIn, 0);
  const totalFinalValue = playerBalances.reduce(
    (sum, b) => sum + b.finalValue,
    0
  );
  const totalPot = totalPaidIn; // total money in the pot equals total paid in

  const isValid = totalPaidIn === totalFinalValue;
  let error: string | undefined;
  if (!isValid) {
    const diff = totalFinalValue - totalPaidIn;
    error = `Total final value (${formatMoney(totalFinalValue)}) does not match total paid-in (${formatMoney(totalPaidIn)}). Difference: ${formatMoney(diff)}.`;
  }

  const transfers = isValid ? computeMinimizedTransfers(playerBalances) : [];

  return {
    playerBalances,
    totalPot,
    totalPaidIn,
    totalFinalValue,
    isValid,
    error,
    transfers,
  };
}

/**
 * Generate minimized list of transfers between debtors and creditors.
 * Simple greedy algorithm: sort debtors and creditors, match amounts.
 */
function computeMinimizedTransfers(
  balances: PlayerBalance[]
): SettlementTransfer[] {
  const debtors = balances
    .filter((b) => b.net < 0)
    .map((b) => ({
      userId: b.userId,
      amount: -b.net, // positive amount they owe
    }));
  const creditors = balances
    .filter((b) => b.net > 0)
    .map((b) => ({
      userId: b.userId,
      amount: b.net, // positive amount they are owed
    }));

  // Sort descending by amount
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: SettlementTransfer[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const transferAmount = Math.min(debtor.amount, creditor.amount);

    transfers.push({
      fromPlayerId: debtor.userId,
      toPlayerId: creditor.userId,
      amount: transferAmount,
      description: `${formatMoney(transferAmount)}`,
    });

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (debtor.amount === 0) dIdx++;
    if (creditor.amount === 0) cIdx++;
  }

  return transfers;
}

/**
 * Validate that total final value equals total paid‑in.
 */
export function validateTotals(
  players: MatchPlayer[],
  buyInAmount: number
): {
  isValid: boolean;
  totalPaidIn: number;
  totalFinalValue: number;
  diff: number;
} {
  const totalPaidIn = players.reduce(
    (sum, p) => sum + p.buyIns * buyInAmount,
    0
  );
  const totalFinalValue = players.reduce((sum, p) => sum + p.finalValue, 0);
  const diff = totalFinalValue - totalPaidIn;
  const isValid = diff === 0;
  return { isValid, totalPaidIn, totalFinalValue, diff };
}

/**
 * Format cents to euros with two decimal places and EUR symbol.
 * @deprecated Use formatMoney from '@/lib/money' instead.
 */
export function formatCents(cents: number): string {
  return formatMoney(cents);
}

/**
 * Format settlement data as a plain-text message suitable for sharing.
 * Output matches the format:
 *
 * 13 Mar 2026
 *
 * Results:
 * 1. Alice: +15.00 EUR (1 buy-in)
 * 2. Charlie: -5.00 EUR (1 buy-in)
 * 3. Bob: -10.00 EUR (2 buy-ins)
 *
 * Transfers:
 * Bob -> Alice: 10.00 EUR
 * Charlie -> Alice: 5.00 EUR
 */
export function formatSettlementShareText({
  createdAt,
  matchPlayers,
  players,
  settlement,
}: {
  createdAt: string;
  matchPlayers: MatchPlayer[];
  players: Array<{ id: string; name: string }>;
  settlement: SettlementResult;
}): string {
  // Format date as "13 Mar 2026"
  const date = new Date(createdAt);
  const dateStr = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  // Build maps
  const playerNameMap = new Map(players.map((p) => [p.id, p.name]));
  const buyInsMap = new Map(matchPlayers.map((mp) => [mp.userId, mp.buyIns]));

  // Combine balances with name and buy-ins
  const combined = settlement.playerBalances.map((balance) => ({
    ...balance,
    name: playerNameMap.get(balance.userId) || "Unknown",
    buyIns: buyInsMap.get(balance.userId) || 0,
  }));

  // Sort by net descending, preserving original order on tie (stable sort)
  const sorted = [...combined].sort((a, b) => b.net - a.net);

  // Build results lines
  const resultsLines = sorted.map((balance, idx) => {
    const signedAmount = formatMoney(balance.net, { showPlus: true });
    const buyInLabel = balance.buyIns === 1 ? "buy-in" : "buy-ins";
    return `${idx + 1}. ${balance.name}: ${signedAmount} (${balance.buyIns} ${buyInLabel})`;
  });

  // Build transfers lines
  let transfersLines: string[];
  if (settlement.transfers.length === 0) {
    transfersLines = ["No transfers needed."];
  } else {
    transfersLines = settlement.transfers.map((transfer) => {
      const fromName = playerNameMap.get(transfer.fromPlayerId) || "Unknown";
      const toName = playerNameMap.get(transfer.toPlayerId) || "Unknown";
      const amount = formatMoney(transfer.amount);
      return `${fromName} -> ${toName}: ${amount}`;
    });
  }

  // Combine all parts
  return `${dateStr}\n\nResults:\n${resultsLines.join("\n")}\n\nTransfers:\n${transfersLines.join("\n")}`;
}
