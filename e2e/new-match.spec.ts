/* eslint-disable */
import { test } from '@playwright/test';

import { addPlayer, expect, seedLocalStorage, loginAdmin, createGroup } from './helpers';

test.describe('New Match Setup', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app origin to allow localStorage access, clear
    await page.goto('/history');
    await page.evaluate(() => window.localStorage.clear());
    // Seed default group and active group for groups-first UX
    await seedLocalStorage(page, {});
    // Log in as admin (required for server-backed groups)
    await loginAdmin(page);
    // Create default group with unique slug via UI (since server groups are empty)
    const uniqueSlug = `home-game-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await createGroup(page, uniqueSlug, 'Home Game');
    // Stay on current page (groups page) or about:blank? We'll stay on groups page.
  });

  test('empty state when there are no players', async ({ page }) => {
    await page.goto('/new-match');
    
    await expect(page.getByRole('heading', { name: 'NEW MATCH SETUP' })).toBeVisible();
    await expect(page.getByText('No players found.')).toBeVisible();
    await expect(page.getByText('Go to Players tab to add players first.')).toBeVisible();
    
    // START MATCH button should be disabled
    const startButton = page.getByRole('button', { name: 'START MATCH' });
    await expect(startButton).toBeDisabled();
  });

  test('select and unselect players updates count', async ({ page }) => {
    // Seed players via localStorage for faster setup
    await seedLocalStorage(page, {
      players: [
        { id: '1', name: 'Alice', createdAt: new Date().toISOString() },
        { id: '2', name: 'Bob', createdAt: new Date().toISOString() },
        { id: '3', name: 'Charlie', createdAt: new Date().toISOString() },
      ],
    });
    
    await page.goto('/new-match');
    
    // Initially 0 selected
    await expect(page.getByText('Selected: 0 player(s)')).toBeVisible();
    
    // Select Alice and Bob
    await page.getByRole('button', { name: 'Alice' }).click();
    await page.getByRole('button', { name: 'Bob' }).click();
    
    await expect(page.getByText('Selected: 2 player(s)')).toBeVisible();
    
    // Unselect Alice
    await page.getByRole('button', { name: 'Alice' }).click();
    await expect(page.getByText('Selected: 1 player(s)')).toBeVisible();
    
    // Verify only Bob is selected (has checkmark)
    await expect(page.locator('button', { hasText: 'Alice' }).getByText('✓')).not.toBeVisible();
    await expect(page.locator('button', { hasText: 'Bob' }).getByText('✓')).toBeVisible();
  });

  test('custom title is accepted and shown', async ({ page }) => {
    await seedLocalStorage(page, {
      players: [
        { id: '1', name: 'Alice', createdAt: new Date().toISOString() },
      ],
    });
    
    await page.goto('/new-match');
    await page.getByRole('button', { name: 'Alice' }).click();
    
    const title = 'Friday Night Poker';
    await page.getByTestId('match-title-input').fill(title);
    
    // Title should remain in input
    await expect(page.getByTestId('match-title-input')).toHaveValue(title);
  });

  test('custom buy-in override updates summary', async ({ page }) => {
    await seedLocalStorage(page, {
      players: [
        { id: '1', name: 'Alice', createdAt: new Date().toISOString() },
        { id: '2', name: 'Bob', createdAt: new Date().toISOString() },
      ],
    });
    
    await page.goto('/new-match');
    await page.getByRole('button', { name: 'Alice' }).click();
    await page.getByRole('button', { name: 'Bob' }).click();
    
    // Default buy-in should be 10.00 EUR (1000 cents)
    await expect(page.getByText('Buy-in each')).toBeVisible();
    await expect(page.getByText('10.00 EUR')).toBeVisible();
    await expect(page.getByText('Total pot')).toBeVisible();
    await expect(page.getByText('20.00 EUR')).toBeVisible();
    
    // Change to 12.50 EUR
    await expect(page.getByTestId('buy-in-amount-input')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('buy-in-amount-input').fill('12.50');
    
    // Summary should update
    await expect(page.getByText('12.50 EUR')).toBeVisible();
    await expect(page.getByText('25.00 EUR')).toBeVisible(); // 2 * 12.50
  });

  test('cannot start match with zero players', async ({ page }) => {
    await seedLocalStorage(page, {
      players: [
        { id: '1', name: 'Alice', createdAt: new Date().toISOString() },
      ],
    });
    
    await page.goto('/new-match');
    
    // Button should be disabled when no players selected
    const startButton = page.getByRole('button', { name: 'START MATCH' });
    await expect(startButton).toBeDisabled();
    
    // Select Alice, button should be enabled
    await page.getByRole('button', { name: 'Alice' }).click();
    await expect(startButton).toBeEnabled();
    
    // Unselect, button should be disabled again
    await page.getByRole('button', { name: 'Alice' }).click();
    await expect(startButton).toBeDisabled();
  });



  test('complete match setup flow', async ({ page }) => {
    await seedLocalStorage(page, {
      players: [
        { id: '1', name: 'Alice', createdAt: new Date().toISOString() },
        { id: '2', name: 'Bob', createdAt: new Date().toISOString() },
      ],
    });
    
    await page.goto('/new-match');
    
    // Select both players
    await page.getByRole('button', { name: 'Alice' }).click();
    await page.getByRole('button', { name: 'Bob' }).click();
    
    // Set custom title and buy-in
    await page.getByTestId('match-title-input').fill('Test Match');
    await page.getByTestId('buy-in-amount-input').fill('15.00');
    
    // Verify summary
    const playersLabel = page.locator('span.text-retro-light', { hasText: 'Players' });
    await expect(playersLabel).toBeVisible();
    await expect(playersLabel.locator('..').locator('span.font-pixel')).toHaveText('2');
    await expect(page.getByText('15.00 EUR')).toBeVisible();
    await expect(page.getByText('30.00 EUR')).toBeVisible();
    
    // Start match
    await page.getByRole('button', { name: 'START MATCH' }).click();
    
    // Should navigate to live match
    await expect(page.getByRole('heading', { name: 'LIVE MATCH' })).toBeVisible();
    await expect(page.getByText('Alice')).toBeVisible();
    await expect(page.getByText('Bob')).toBeVisible();
    await expect(page.getByText('Buy‑ins: 1')).toHaveCount(2); // Each starts with 1
  });
});