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
  const totalFinalValue = playerBalances.reduce((sum, b) => sum + b.finalValue, 0);
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
function computeMinimizedTransfers(balances: PlayerBalance[]): SettlementTransfer[] {
  const debtors = balances.filter((b) => b.net < 0).map((b) => ({
    userId: b.userId,
    amount: -b.net, // positive amount they owe
  }));
  const creditors = balances.filter((b) => b.net > 0).map((b) => ({
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
): { isValid: boolean; totalPaidIn: number; totalFinalValue: number; diff: number } {
  const totalPaidIn = players.reduce((sum, p) => sum + p.buyIns * buyInAmount, 0);
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