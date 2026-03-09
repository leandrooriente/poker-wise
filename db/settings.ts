export interface AppSettings {
  defaultBuyIn: number; // cents
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultBuyIn: 1000, // 10.00 EUR
};

const STORAGE_KEY = "poker-wise-settings";

export async function getSettings(): Promise<AppSettings> {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Failed to load settings:", error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

export async function updateDefaultBuyIn(buyInCents: number): Promise<void> {
  const settings = await getSettings();
  settings.defaultBuyIn = buyInCents;
  await saveSettings(settings);
}