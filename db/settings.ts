export interface AppSettings {
  defaultBuyIn: number; // cents
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultBuyIn: 1000, // 10.00 EUR
};

export async function getSettings(): Promise<AppSettings> {
  // TODO: Fetch default buy-in from backend per-group settings
  return DEFAULT_SETTINGS;
}

export async function saveSettings(_settings: AppSettings): Promise<void> {
  // No-op; settings are not persisted locally anymore
}

export async function updateDefaultBuyIn(buyInCents: number): Promise<void> {
  // TODO: Update backend per-group settings
  console.warn("updateDefaultBuyIn is not yet implemented for backend");
}