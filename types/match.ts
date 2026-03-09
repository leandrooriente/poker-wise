import { Player } from "./player";

export interface MatchPlayer {
  playerId: string;
  buyIns: number; // number of buy-ins purchased during the match
  finalValue: number; // in cents, total value of chips at cashout
}

export interface Match {
  id: string;
  title?: string;
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
  fromPlayerId: string;
  toPlayerId: string;
  amount: number; // in cents
  description?: string;
}

export interface MatchSummary extends Match {
  playerDetails: (Player & MatchPlayer)[];
  totalBuyIns: number;
  totalValue: number;
  netResults: Record<string, number>; // playerId -> net result in cents
}