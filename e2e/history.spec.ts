/* eslint-disable */
import { test } from '@playwright/test';

import { expect, seedLocalStorage, openLatestHistoryMatch, fillCashoutValues } from './helpers';

test.describe('History Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app origin to allow localStorage access, clear, then leave
    await page.goto('/history');
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('about:blank');
  });

  test('empty state shows no matches message', async ({ page }) => {
    await page.goto('/history');
    await expect(page.getByRole('heading', { name: 'MATCH HISTORY' })).toBeVisible();
    await expect(page.getByText('No matches yet.')).toBeVisible();
    await expect(page.getByText('Start a new match from the "New Match" tab')).toBeVisible();
  });

  test('match list shows matches sorted newest first', async ({ page }) => {
    // Create three matches with different createdAt dates
    const oldMatch = new Date('2026-03-01T12:00:00Z').toISOString();
    const middleMatch = new Date('2026-03-05T15:30:00Z').toISOString();
    const newestMatch = new Date('2026-03-09T18:45:00Z').toISOString();

    await seedLocalStorage(page, {
      players: [
        { id: 'p1', name: 'Alice', createdAt: new Date().toISOString() },
        { id: 'p2', name: 'Bob', createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: 'match-old',
          buyInAmount: 1000,
          players: [
            { userId: 'p1', buyIns: 1, finalValue: 1000 },
            { userId: 'p2', buyIns: 1, finalValue: 1000 },
          ],
          startedAt: oldMatch,
          createdAt: oldMatch,
        },
        {
          id: 'match-middle',
          buyInAmount: 1500,
          players: [
            { userId: 'p1', buyIns: 2, finalValue: 3000 },
          ],
          startedAt: middleMatch,
          createdAt: middleMatch,
        },
        {
          id: 'match-newest',
          buyInAmount: 1000,
          players: [
            { userId: 'p1', buyIns: 1, finalValue: 2000 },
            { userId: 'p2', buyIns: 1, finalValue: 0 },
          ],
          startedAt: newestMatch,
          createdAt: newestMatch,
        },
      ],
    });

    await page.goto('/history');
    await expect(page.getByRole('heading', { name: 'MATCH HISTORY' })).toBeVisible();

    // Expect three match entries
    const matchEntries = page.getByTestId('match-entry');
    await expect(matchEntries).toHaveCount(3);

    // First entry should be newest (Mar 9)
    await expect(matchEntries.nth(0)).toContainText('Match on 09 Mar 2026');
    // Second entry middle (Mar 5)
    await expect(matchEntries.nth(1)).toContainText('Match on 05 Mar 2026');
    // Third entry oldest (Mar 1)
    await expect(matchEntries.nth(2)).toContainText('Match on 01 Mar 2026');

    // Verify each match shows buy‑in and pot
    await expect(page.getByText('Buy‑in: 10.00 EUR')).toHaveCount(2); // old and newest
    await expect(page.getByText('Buy‑in: 15.00 EUR')).toHaveCount(1); // middle match
    await expect(page.getByText('Pot: 20.00 EUR').first()).toBeVisible(); // old match
    await expect(page.getByText('Pot: 30.00 EUR')).toBeVisible(); // middle match (2 buy-ins * 15)
    await expect(page.getByText('Pot: 20.00 EUR')).toHaveCount(2); // newest also 20
  });

  test('clicking match expands details', async ({ page }) => {
    await seedLocalStorage(page, {
      players: [
        { id: 'p1', name: 'Alice', createdAt: new Date().toISOString() },
        { id: 'p2', name: 'Bob', createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: 'test-match',
          buyInAmount: 1000,
          players: [
            { userId: 'p1', buyIns: 1, finalValue: 1500 },
            { userId: 'p2', buyIns: 1, finalValue: 500 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto('/history');
    const matchEntry = page.getByTestId('match-entry').first();
    // Initially not expanded (no SETTLEMENT heading)
    await expect(matchEntry.getByRole('heading', { name: 'SETTLEMENT' })).not.toBeVisible();

    // Click to expand
    await matchEntry.click();
    await expect(matchEntry.getByRole('heading', { name: 'SETTLEMENT' })).toBeVisible();
    await expect(matchEntry.getByRole('heading', { name: 'PLAYER DETAILS' })).toBeVisible();

    // Click again to collapse
    await matchEntry.click();
    await expect(matchEntry.getByRole('heading', { name: 'SETTLEMENT' })).not.toBeVisible();
  });

  test('expanded details show player balances and transfers', async ({ page }) => {
    await seedLocalStorage(page, {
      players: [
        { id: 'p1', name: 'Alice', createdAt: new Date().toISOString() },
        { id: 'p2', name: 'Bob', createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: 'test-match',
          buyInAmount: 1000,
          players: [
            { userId: 'p1', buyIns: 1, finalValue: 1500 },
            { userId: 'p2', buyIns: 1, finalValue: 500 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto('/history');
    const matchEntry = page.getByTestId('match-entry').first();
    await matchEntry.click();

    // Balances section
    const balancesSection = matchEntry.getByRole('heading', { name: 'Balances' }).locator('..');

    await expect(balancesSection.getByText('Alice')).toBeVisible();
    await expect(balancesSection.getByText('Bob')).toBeVisible();
    await expect(balancesSection.locator('li').filter({ hasText: 'Alice' }).getByText('5.00 EUR')).toBeVisible(); // Alice net +5
    await expect(balancesSection.locator('li').filter({ hasText: 'Bob' }).getByText('-5.00 EUR')).toBeVisible(); // Bob net -5

    // Transfers section
    const transfersSection = matchEntry.getByRole('heading', { name: 'Transfers' }).locator('..');
    await expect(transfersSection.getByText('Bob → Alice')).toBeVisible();
    await expect(transfersSection.getByText('5.00 EUR')).toBeVisible();

    // Player details headings
    await expect(matchEntry.getByRole('heading', { name: 'PLAYER DETAILS' })).toBeVisible();
    await expect(matchEntry.getByText('Buy‑ins:').first()).toBeVisible();
    await expect(matchEntry.getByText('Final value:').first()).toBeVisible();
    await expect(matchEntry.getByText('Paid in:').first()).toBeVisible();
    await expect(matchEntry.getByText('Net result:').first()).toBeVisible();
  });

  test('history persists after reload', async ({ page }) => {
    // Add a match via UI (using helpers) and verify it appears after reload
    await seedLocalStorage(page, {
      players: [
        { id: 'p1', name: 'Alice', createdAt: new Date().toISOString() },
        { id: 'p2', name: 'Bob', createdAt: new Date().toISOString() },
      ],
    });

    // Create a match via UI steps
    await page.goto('/new-match');
    await page.getByRole('button', { name: 'Alice' }).click();
    await page.getByRole('button', { name: 'Bob' }).click();
    await page.getByRole('button', { name: 'START MATCH' }).click();

    // Live match: immediate cashout
    await page.getByRole('button', { name: 'CASHOUT' }).click();
    // Fill values (match total paid-in = 20)
    await fillCashoutValues(page, { 'Alice': 12.50, 'Bob': 7.50 });

    await page.getByRole('button', { name: 'SETTLE & SHOW RESULTS' }).click();
    // Results page: we can go to history
    await page.getByRole('button', { name: 'VIEW HISTORY' }).click();

    // Debug: log matches in storage
    const matchCountBefore = await page.evaluate(() => {
      const matches = JSON.parse(localStorage.getItem('poker-wise-matches') || '[]');
      return matches.length;
    });
    console.log(`Matches in localStorage before reload: ${matchCountBefore}`);

    // Should see the match in history
    await expect(page.getByRole('heading', { name: 'MATCH HISTORY' })).toBeVisible();
    const matchEntry = page.getByTestId('match-entry');
    await expect(matchEntry).toBeVisible();
    await expect(matchEntry.getByText('Match on')).toBeVisible();

    // Reload page
    await page.reload();

    // Debug: log matches after reload
    const matchCountAfter = await page.evaluate(() => {
      const matches = JSON.parse(localStorage.getItem('poker-wise-matches') || '[]');
      return matches.length;
    });
    console.log(`Matches in localStorage after reload: ${matchCountAfter}`);

    await expect(page.getByRole('heading', { name: 'MATCH HISTORY' })).toBeVisible();
    await expect(page.getByTestId('match-entry')).toBeVisible();
    await expect(page.getByTestId('match-entry').getByText('Match on')).toBeVisible(); // still there
  });

  test('openLatestHistoryMatch helper works', async ({ page }) => {
    // Seed two matches, helper should open the newest
    const oldMatch = new Date('2026-03-01T12:00:00Z').toISOString();
    const newMatch = new Date('2026-03-09T18:45:00Z').toISOString();

    await seedLocalStorage(page, {
      players: [
        { id: 'p1', name: 'Alice', createdAt: new Date().toISOString() },
        { id: 'p2', name: 'Bob', createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: 'old',
          buyInAmount: 1000,
          players: [
            { userId: 'p1', buyIns: 1, finalValue: 1000 },
            { userId: 'p2', buyIns: 1, finalValue: 1000 },
          ],
          startedAt: oldMatch,
          createdAt: oldMatch,
        },
        {
          id: 'new',
          buyInAmount: 1500,
          players: [
            { userId: 'p1', buyIns: 2, finalValue: 3000 },
          ],
          startedAt: newMatch,
          createdAt: newMatch,
        },
      ],
    });

    await openLatestHistoryMatch(page);
    // Should have expanded the newest match (Mar 9)
    const matchEntry = page.getByTestId('match-entry').first();
    await expect(matchEntry.getByText('Match on 09 Mar 2026')).toBeVisible();
    await expect(matchEntry.getByText('SETTLEMENT')).toBeVisible(); // expanded
    // Verify it's the correct match (buy‑in 15.00)
    await expect(page.getByText('Buy‑in: 15.00 EUR')).toBeVisible();
  });
});