/* eslint-disable */
import { Page } from '@playwright/test';

export interface PlayerData {
  name: string;
  notes?: string;
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
  await page.getByPlaceholder('Player name').fill(data.name);
  
  await page.getByRole('button', { name: 'ADD' }).click();
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
    // Wait for at least one matching heading to be attached
    await heading.first().waitFor({ state: 'attached' });
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
    // Seed users in new storage key (poker-wise-users)
    if (opts.players) {
      const users = opts.players.map(p => ({
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
      }));
      localStorage.setItem('poker-wise-users', JSON.stringify(users));
      // Also seed legacy key for backward compatibility in tests
      localStorage.setItem('poker-wise-players', JSON.stringify(opts.players));
    }
    // Ensure default group exists
    const groups = [{ id: 'home-game', createdAt: new Date().toISOString() }];
    localStorage.setItem('poker-wise-groups', JSON.stringify(groups));
    // Set active group
    localStorage.setItem('poker-wise-active-group', 'home-game');
    
    // Ensure group memberships exist for seeded users
    if (opts.players) {
      const members = opts.players.map(p => ({
        groupId: 'home-game',
        userId: p.id,
        joinedAt: new Date().toISOString(),
      }));
      localStorage.setItem('poker-wise-group-members', JSON.stringify(members));
    }
    
    if (opts.matches) {
      // Convert legacy playerId to userId and add groupId if missing
      const convertedMatches = opts.matches.map(match => ({
        ...match,
        groupId: match.groupId || 'home-game',
        players: match.players.map((mp: any) => {
          const { playerId, ...rest } = mp;
          return {
            ...rest,
            userId: mp.userId || mp.playerId,
          };
        }),
      }));
      localStorage.setItem('poker-wise-matches', JSON.stringify(convertedMatches));
    }
    if (opts.settings) {
      localStorage.setItem('poker-wise-settings', JSON.stringify(opts.settings));
    }
    // Set migration marker to true to skip migration (since we seeded new format directly)
    localStorage.setItem('poker-wise-migration-v1-done', 'true');
  }, options);
}

// Re-export expect for convenience
import { expect } from '@playwright/test';
export { expect };