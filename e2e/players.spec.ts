import { test } from '@playwright/test';
import { addPlayer, expect, seedLocalStorage } from './helpers';

test.describe('Player Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app origin to allow localStorage access, clear, and stay on players page
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
  });

  test('add player with notes and preferred buy-in', async ({ page }) => {
    await addPlayer(page, {
      name: 'Alice',
      notes: 'Aggressive player',
      preferredBuyIn: 1250, // 12.50 EUR
    });

    // Verify player card shows all details
    const playerCard = page.locator('div', { has: page.getByText('Alice') });
    await expect(playerCard.getByText('Alice')).toBeVisible();
    await expect(playerCard.getByText('Aggressive player')).toBeVisible();
    await expect(playerCard.getByText('12.50')).toBeVisible();
    
    // Verify the player count updates
    await expect(page.getByText('REGULAR PLAYERS (1)')).toBeVisible();
  });

  test('edit player name and notes', async ({ page }) => {
    await addPlayer(page, { name: 'Bob' });
    
    // Click Edit button
    const playerCard = page.getByTestId('player-card').first();
    await playerCard.getByRole('button', { name: 'Edit' }).click();
    
    // Update name and notes
    await expect(playerCard.getByPlaceholder('Player name')).toBeVisible();
    await playerCard.getByPlaceholder('Player name').fill('Robert');
    await playerCard.getByPlaceholder('Optional notes').fill('New notes');
    await playerCard.getByRole('button', { name: 'Save' }).click();
    
    // Verify updates
    await expect(playerCard.getByText('Robert')).toBeVisible();
    await expect(playerCard.getByText('New notes')).toBeVisible();
    await expect(page.getByText('Bob')).not.toBeVisible();
  });

  test('delete player', async ({ page }) => {
    await addPlayer(page, { name: 'Charlie' });
    await addPlayer(page, { name: 'David' });
    
    // Verify two players
    await expect(page.getByText('REGULAR PLAYERS (2)')).toBeVisible();
    
    // Delete Charlie
    const charlieCard = page.getByTestId('player-card').filter({ hasText: 'Charlie' });
    await charlieCard.getByRole('button', { name: 'Delete' }).click();
    
    // Verify deletion
    await expect(page.getByText('Charlie')).not.toBeVisible();
    await expect(page.getByText('REGULAR PLAYERS (1)')).toBeVisible();
    await expect(page.getByText('David')).toBeVisible();
  });

  test('player data persists after reload', async ({ page }) => {
    await addPlayer(page, {
      name: 'Eve',
      notes: 'Persistence test',
      preferredBuyIn: 800, // 8.00 EUR
    });
    
    // Reload page
    await page.reload();
    
    // Verify player still exists with all details
    await expect(page.getByText('Eve')).toBeVisible();
    await expect(page.getByText('Persistence test')).toBeVisible();
    await expect(page.getByText('8.00')).toBeVisible();
  });

  test('empty state when no players', async ({ page }) => {
    // Already cleared in beforeEach
    await expect(page.getByText('No players yet. Add your first!')).toBeVisible();
    await expect(page.getByText('REGULAR PLAYERS (0)')).toBeVisible();
  });

  test('cannot add player with empty name', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: 'ADD PLAYER' }).click();
    
    // Should still have no players
    await expect(page.getByText('REGULAR PLAYERS (0)')).toBeVisible();
  });
});