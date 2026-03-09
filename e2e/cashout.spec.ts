import { test } from '@playwright/test';
import { expect, seedLocalStorage, fillCashoutValues } from './helpers';

test.describe('Cashout', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app origin to allow localStorage access, clear, then leave
    await page.goto('/history');
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('about:blank');
  });

  test('mismatch totals show invalid state and disable settlement', async ({ page }) => {
    // Setup a 2-player match
    const matchId = 'cashout-test-1';
    await seedLocalStorage(page, {
      players: [
        { id: 'p1', name: 'Alice', createdAt: new Date().toISOString() },
        { id: 'p2', name: 'Bob', createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          buyInAmount: 1000, // 10.00 EUR
          players: [
            { playerId: 'p1', buyIns: 1, finalValue: 0 },
            { playerId: 'p2', buyIns: 1, finalValue: 0 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/cashout?match=${matchId}`);
    await expect(page.getByRole('heading', { name: 'CASHOUT' })).toBeVisible();
    
    // Total paid-in: 20.00 EUR (2 * 10)
    const validationSection = page.getByRole('heading', { name: 'VALIDATION' }).locator('..');
    const paidInRow = validationSection.locator('div.flex.justify-between').filter({ hasText: 'Total paid‑in' });
    await expect(paidInRow.getByText('20.00 EUR').first()).toBeVisible();
    
    // Enter mismatched values: Alice 15, Bob 10 = 25 total (should mismatch by 5)
    await fillCashoutValues(page, {
      'Alice': 15.00,
      'Bob': 10.00,
    });
    
    // Should show error state
    await expect(validationSection.getByText('✗ Totals do not match. Adjust values.')).toBeVisible();
    const differenceRow = validationSection.locator('div.flex.justify-between').filter({ hasText: 'Difference' });
    await expect(differenceRow.getByText('Difference')).toBeVisible();
    await expect(differenceRow.getByText('5.00 EUR')).toBeVisible(); // 25 - 20 = 5
    
    // Settle button should be disabled
    const settleButton = page.getByRole('button', { name: 'SETTLE & SHOW RESULTS' });
    await expect(settleButton).toBeDisabled();
  });

  test('exact totals enable settlement', async ({ page }) => {
    const matchId = 'cashout-test-2';
    await seedLocalStorage(page, {
      players: [
        { id: 'p1', name: 'Alice', createdAt: new Date().toISOString() },
        { id: 'p2', name: 'Bob', createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          buyInAmount: 1000,
          players: [
            { playerId: 'p1', buyIns: 1, finalValue: 0 },
            { playerId: 'p2', buyIns: 1, finalValue: 0 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/cashout?match=${matchId}`);
    const validationSection = page.getByRole('heading', { name: 'VALIDATION' }).locator('..');
    
    // Enter exact totals: Alice 12, Bob 8 = 20 total (matches paid-in)
    await fillCashoutValues(page, {
      'Alice': 12.00,
      'Bob': 8.00,
    });
    
    // Should show success state
    await expect(validationSection.getByText('✓ Totals match! Ready to settle.')).toBeVisible();
    const differenceRow = validationSection.locator('div.flex.justify-between').filter({ hasText: 'Difference' });
    await expect(differenceRow.getByText('Difference')).toBeVisible();
    await expect(differenceRow.getByText('0.00 EUR')).toBeVisible();
    
    // Settle button should be enabled
    const settleButton = page.getByRole('button', { name: 'SETTLE & SHOW RESULTS' });
    await expect(settleButton).toBeEnabled();
    
    // Click settle and navigate to results
    await settleButton.click();
    await expect(page.getByRole('heading', { name: 'SETTLEMENT RESULTS' })).toBeVisible();
  });

  test('cent values work correctly', async ({ page }) => {
    const matchId = 'cashout-test-3';
    await seedLocalStorage(page, {
      players: [
        { id: 'p1', name: 'Alice', createdAt: new Date().toISOString() },
        { id: 'p2', name: 'Bob', createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          buyInAmount: 1000,
          players: [
            { playerId: 'p1', buyIns: 2, finalValue: 0 }, // 20.00 paid
            { playerId: 'p2', buyIns: 1, finalValue: 0 }, // 10.00 paid
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/cashout?match=${matchId}`);
    
    // Total paid-in: 30.00 EUR
    const validationSection = page.getByRole('heading', { name: 'VALIDATION' }).locator('..');
    const paidInRow = validationSection.locator('div.flex.justify-between').filter({ hasText: 'Total paid‑in' });
    await expect(paidInRow.getByText('30.00 EUR').first()).toBeVisible();
    
    // Enter cent values
    await fillCashoutValues(page, {
      'Alice': 18.75,
      'Bob': 11.25,
    });
    
    // Should match exactly (18.75 + 11.25 = 30.00)
    await expect(validationSection.getByText('✓ Totals match! Ready to settle.')).toBeVisible();
    const differenceRow = validationSection.locator('div.flex.justify-between').filter({ hasText: 'Difference' });
    await expect(differenceRow.getByText('Difference')).toBeVisible();
    await expect(differenceRow.getByText('0.00 EUR')).toBeVisible();
    
    // Verify net calculations show cents
    // Alice net: 18.75 - 20.00 = -1.25
    await expect(page.getByRole('heading', { name: 'Alice' }).locator('..').locator('..').locator('div.text-center').getByText('-1.25 EUR')).toBeVisible();
    // Bob net: 11.25 - 10.00 = +1.25 (UI shows "1.25 EUR" without plus)
    await expect(page.getByRole('heading', { name: 'Bob' }).locator('..').locator('..').locator('div.text-center').getByText('1.25 EUR')).toBeVisible();
  });

  test('validation updates in real time as values change', async ({ page }) => {
    const matchId = 'cashout-test-4';
    await seedLocalStorage(page, {
      players: [
        { id: 'p1', name: 'Alice', createdAt: new Date().toISOString() },
        { id: 'p2', name: 'Bob', createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          buyInAmount: 1000,
          players: [
            { playerId: 'p1', buyIns: 1, finalValue: 0 },
            { playerId: 'p2', buyIns: 1, finalValue: 0 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/cashout?match=${matchId}`);
    const validationSection = page.getByRole('heading', { name: 'VALIDATION' }).locator('..');
    
    // Start with empty values (0 + 0 = 0, mismatch by 20)
    await expect(validationSection.getByText('✗ Totals do not match. Adjust values.')).toBeVisible();
    const differenceRow = validationSection.locator('div.flex.justify-between').filter({ hasText: 'Difference' });
    await expect(differenceRow.getByText('-20.00 EUR')).toBeVisible(); // 0 - 20 = -20
    
    // Fill first value
    const aliceInput = page.getByRole('heading', { name: 'Alice' }).locator('..').locator('..').locator('..').getByLabel('FINAL VALUE (EUR)');
    await aliceInput.fill('12.50');
    
    // Still mismatch: 12.50 + 0 = 12.50, diff = -7.50
    await expect(validationSection.getByText('✗ Totals do not match. Adjust values.')).toBeVisible();
    await expect(differenceRow.getByText('-7.50 EUR')).toBeVisible();
    
    // Fill second value to match
    const bobInput = page.getByRole('heading', { name: 'Bob' }).locator('..').locator('..').locator('..').getByLabel('FINAL VALUE (EUR)');
    await bobInput.fill('7.50');
    
    // Should match now
    await expect(validationSection.getByText('✓ Totals match! Ready to settle.')).toBeVisible();
    await expect(differenceRow.getByText('0.00 EUR')).toBeVisible();
  });

  test('single player cashout (break-even)', async ({ page }) => {
    const matchId = 'cashout-test-5';
    await seedLocalStorage(page, {
      players: [
        { id: 'p1', name: 'Solo', createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          buyInAmount: 1000,
          players: [
            { playerId: 'p1', buyIns: 3, finalValue: 0 }, // 30.00 paid
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/cashout?match=${matchId}`);
    
    // Enter exact value
    await fillCashoutValues(page, {
      'Solo': 30.00,
    });
    
    await expect(page.getByText('✓ Totals match! Ready to settle.')).toBeVisible();
    await expect(page.getByText('Solo').locator('..').getByText('0.00 EUR')).toBeVisible(); // net zero
  });

  test('error state when match not found', async ({ page }) => {
    await page.goto('/cashout?match=invalid-id');
    
    await expect(page.getByRole('heading', { name: 'ERROR' })).toBeVisible();
    await expect(page.getByText('Match not found')).toBeVisible();
    
    // Should have button to start new match
    await page.getByRole('button', { name: 'Start New Match' }).click();
    await expect(page.getByRole('heading', { name: 'NEW MATCH SETUP' })).toBeVisible();
  });

  test('proceeds to results after settlement', async ({ page }) => {
    const matchId = 'cashout-test-6';
    await seedLocalStorage(page, {
      players: [
        { id: 'p1', name: 'Winner', createdAt: new Date().toISOString() },
        { id: 'p2', name: 'Loser', createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          buyInAmount: 1000,
          players: [
            { playerId: 'p1', buyIns: 1, finalValue: 0 },
            { playerId: 'p2', buyIns: 1, finalValue: 0 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/cashout?match=${matchId}`);
    
    // Setup a clear win/loss: Winner 15, Loser 5
    await fillCashoutValues(page, {
      'Winner': 15.00,
      'Loser': 5.00,
    });
    
    // Wait for validation to show success
    const validationSection = page.getByRole('heading', { name: 'VALIDATION' }).locator('..');
    await expect(validationSection.getByText('✓ Totals match! Ready to settle.')).toBeVisible();
    
    // Settle
    await page.getByRole('button', { name: 'SETTLE & SHOW RESULTS' }).click();
    
    // Should be on results page with settlement
    await expect(page.getByRole('heading', { name: 'SETTLEMENT RESULTS' })).toBeVisible();
    const balancesSection = page.getByRole('heading', { name: 'Balances' }).locator('..');
    await expect(balancesSection.getByText('Winner')).toBeVisible();
    await expect(balancesSection.getByText('Loser')).toBeVisible();
    await expect(balancesSection.getByText('+5.00 EUR')).toBeVisible(); // Winner net
    await expect(balancesSection.getByText('-5.00 EUR')).toBeVisible(); // Loser net
  });
});