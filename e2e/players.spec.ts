
import { test } from '@playwright/test';

import { addPlayer, expect, seedLocalStorage } from './helpers';

test.describe('Player Management', () => {
  test.beforeEach(async ({ page }) => {
    // Seed default group and migration marker
    await seedLocalStorage(page, {});
    await page.goto('/');
  });

  test('add player', async ({ page }) => {
    await addPlayer(page, {
      name: 'Alice',
    });

    // Verify player card shows name
    const playerCard = page.locator('div', { has: page.getByText('Alice') });
    await expect(playerCard.getByText('Alice')).toBeVisible();
    

  });

  test.skip('edit player name', async ({ page }) => {
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
    
    // Verify two players in the active group
    const playerItems = page.getByTestId('player-item');
    await expect(playerItems).toHaveCount(2);
    
    // Set up dialog acceptance for confirmation
    page.on('dialog', dialog => dialog.accept());
    
    // Delete Charlie (remove from group)
    const charlieItem = playerItems.filter({ hasText: 'Charlie' });
    await charlieItem.getByRole('button', { name: 'REMOVE' }).click();
    
    // Verify deletion
    await expect(page.getByText('Charlie')).not.toBeVisible();
    await expect(playerItems).toHaveCount(1);
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
    await expect(page.getByText('No players yet.')).toBeVisible();
  });

  test('cannot add player with empty name', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: 'ADD' }).click();
    
    // Should still have no players
    await expect(page.getByText('No players yet.')).toBeVisible();
  });
});