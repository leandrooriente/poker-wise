export interface Player {
  id: string;
  name: string;
  createdAt: string;
  // Optional fields
  preferredBuyIn?: number; // in cents, optional override of default
  notes?: string;
}

export interface PlayerWithStats extends Player {
  totalMatches: number;
  totalBuyIns: number;
  totalNetResult: number; // in cents
}