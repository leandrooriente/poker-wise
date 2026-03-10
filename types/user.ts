export interface User {
  id: string;
  name: string;
  createdAt: string;
}

// Note: `notes` and `preferredBuyIn` have been intentionally removed.
// Buy-in is defined only at the match level, not per user.