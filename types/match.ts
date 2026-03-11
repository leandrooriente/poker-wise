// MatchPlayer now references userId (global user) not playerId (legacy player)
export interface MatchPlayer {
  userId: string; // renamed from playerId to reflect global user reference
  buyIns: number; // number of buy-ins purchased during the match
  finalValue: number; // in cents, total value of chips at cashout
}

export interface Match {
  id: string;
  groupId: string; // added: which group this match belongs to
  title?: string;
  status?: "live" | "settled";
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  buyInAmount: number; // in cents, per buy-in
  players: MatchPlayer[];
  // Derived data (computed, not stored)
  totalPot?: number;
  settlementTransfers?: SettlementTransfer[];
}

export interface SettlementTransfer {
  fromPlayerId: string; // still userId
  toPlayerId: string; // still userId
  amount: number; // in cents
  description?: string;
}

// Note: MatchSummary may need revision after Player type is removed.
// Temporarily kept for compatibility; will be updated when Player type is removed.
export interface MatchSummary extends Match {
  playerDetails: any[]; // placeholder: will be updated later
  totalBuyIns: number;
  totalValue: number;
  netResults: Record<string, number>; // userId -> net result in cents
}
