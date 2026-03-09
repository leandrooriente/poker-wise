import { Page } from '@playwright/test';

export interface PlayerData {
  name: string;
  notes?: string;
  preferredBuyIn?: number; // cents
}

export interface MatchSetup {
  players: string[]; // player names
  title?: string;
  buyIn?: number; // cents, default 1000 (10.00 EUR)
}

/**
 * Add a player via the UI on the players page
 */
export async function addPlayer(page: Page, data: PlayerData) {
  await page.goto('/');
  await page.getByTestId('player-name-input').fill(data.name);
  
  if (data.notes) {
    await page.getByTestId('player-notes-input').fill(data.notes);
  }
  
  if (data.preferredBuyIn !== undefined) {
    await page.getByTestId('player-preferred-buyin-input').fill((data.preferredBuyIn / 100).toFixed(2));
  }
  
  await page.getByRole('button', { name: 'ADD PLAYER' }).click();
  await expect(page.getByText(data.name)).toBeVisible();
}

/**
 * Start a new match via UI
 */
export async function startMatch(page: Page, setup: MatchSetup) {
  await page.goto('/new-match');
  
  // Select players
  for (const playerName of setup.players) {
    await page.getByRole('button', { name: playerName }).click();
  }
  
  // Optional title
  if (setup.title) {
    await page.getByTestId('match-title-input').fill(setup.title);
  }
  
  // Optional custom buy-in
  if (setup.buyIn !== undefined) {
    await page.getByTestId('buy-in-amount-input').fill((setup.buyIn / 100).toFixed(2));
  }
  
  await page.getByRole('button', { name: 'START MATCH' }).click();
  await expect(page.getByRole('heading', { name: 'LIVE MATCH' })).toBeVisible();
}

/**
 * Add rebuys for a player in live match
 */
export async function addRebuy(page: Page, playerName: string, times: number = 1) {
  for (let i = 0; i < times; i++) {
    // Find the player row by name and click REBUY button
    const playerRow = page.getByTestId('player-row').filter({ hasText: playerName });
    await playerRow.getByRole('button', { name: 'REBUY' }).click();
    // Wait a moment for state to update
    await page.waitForTimeout(100);
  }
}

/**
 * Get total pot value displayed in match info (as string, e.g. "30.00 EUR")
 */
export async function getTotalPotText(page: Page): Promise<string> {
  // Locate the "Total pot" label, then find the sibling span with class text-retro-green
  const totalPotLabel = page.getByText('Total pot');
  // The parent div contains two spans: label and value
  const totalPotRow = totalPotLabel.locator('..'); // the flex container div
  const value = totalPotRow.locator('span.font-pixel.text-retro-green');
  return await value.innerText();
}

/**
 * Fill cashout values for players
 * valuesByPlayerName: { [playerName]: amountInEuros }
 */
export async function fillCashoutValues(page: Page, valuesByPlayerName: Record<string, number>) {
  for (const [playerName, amount] of Object.entries(valuesByPlayerName)) {
    // Find the player's border container by heading
    const heading = page.getByRole('heading', { name: playerName });
    const playerSection = heading.locator('..').locator('..').locator('..');
    const input = playerSection.getByLabel('FINAL VALUE (EUR)');
    await input.fill(amount.toFixed(2));
  }
}

/**
 * Navigate to history and open the latest match details
 */
export async function openLatestHistoryMatch(page: Page) {
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'MATCH HISTORY' })).toBeVisible();
  
  // Click the first match entry (newest)
  await page.getByTestId('match-entry').first().click();
}

/**
 * Seed localStorage directly for test setup
 */
export async function seedLocalStorage(
  page: Page,
  options: {
    players?: Array<{ id: string; name: string; notes?: string; preferredBuyIn?: number; createdAt: string }>;
    matches?: any[];
    settings?: { defaultBuyIn: number };
  }
) {
  await page.addInitScript((opts) => {
    if (opts.players) {
      localStorage.setItem('poker-wise-players', JSON.stringify(opts.players));
    }
    if (opts.matches) {
      localStorage.setItem('poker-wise-matches', JSON.stringify(opts.matches));
    }
    if (opts.settings) {
      localStorage.setItem('poker-wise-settings', JSON.stringify(opts.settings));
    }
  }, options);
}

// Re-export expect for convenience
import { expect } from '@playwright/test';
export { expect };