/* eslint-disable */
import { test } from '@playwright/test';

import { addPlayer, expect, seedLocalStorage } from './helpers';

test.describe('Player Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app origin to allow localStorage access, clear, and stay on players page
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
  });

  test('add player', async ({ page }) => {
    await addPlayer(page, {
      name: 'Alice',
    });

    // Verify player card shows name
    const playerCard = page.locator('div', { has: page.getByText('Alice') });
    await expect(playerCard.getByText('Alice')).toBeVisible();
    
    // Verify the player count updates
    await expect(page.getByText('REGULAR PLAYERS (1)')).toBeVisible();
  });

  test('edit player name', async ({ page }) => {
    await addPlayer(page, { name: 'Bob' });
    
    // Click Edit button
    const playerCard = page.getByTestId('player-card').first();
    await playerCard.getByRole('button', { name: 'Edit' }).click();
    
    // Update name
    await expect(playerCard.getByPlaceholder('Player name')).toBeVisible();
    await playerCard.getByPlaceholder('Player name').fill('Robert');
    await playerCard.getByRole('button', { name: 'Save' }).click();
    
    // Verify updates
    await expect(playerCard.getByText('Robert')).toBeVisible();
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
    });
    
    // Reload page
    await page.reload();
    
    // Verify player still exists
    await expect(page.getByText('Eve')).toBeVisible();
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