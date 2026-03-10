import { test, expect } from '@playwright/test';

test.describe('Basic poker match flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await page.goto('/');
  });

  test('complete match flow: add player, start match, rebuy, cashout, settle', async ({ page }) => {
    // 1. Add a player
    await page.getByPlaceholder('e.g., Max').fill('Test Player');
    await page.getByRole('button', { name: 'ADD PLAYER' }).click();
    await expect(page.getByText('Test Player')).toBeVisible();

    // 2. Navigate to New Match
    await page.getByRole('link', { name: 'New Match' }).click();
    await expect(page.getByRole('heading', { name: 'NEW MATCH SETUP' })).toBeVisible();

    // 3. Select the player we just added
    await page.getByRole('button', { name: 'Test Player' }).click();
    // Buy-in amount default 10 EUR, keep as is
    await page.getByRole('button', { name: 'START MATCH' }).click();

    // 4. Should be on Live Match page
    await expect(page.getByRole('heading', { name: 'LIVE MATCH' })).toBeVisible();
    await expect(page.getByText('Test Player')).toBeVisible();

    // 5. Add a rebuy
    await page.getByRole('button', { name: 'REBUY' }).click();
    await expect(page.getByText('Buy‑ins: 2')).toBeVisible();

    // 6. Proceed to cashout
    await page.getByRole('button', { name: 'PROCEED TO CASHOUT' }).click();
    await expect(page.getByRole('heading', { name: 'CASHOUT' })).toBeVisible();

    // 7. Enter final chip value (total pot = 2 buy-ins = 20 EUR)
    // Since only one player, final value must equal total paid-in (20 EUR)
    const finalValueInput = page.getByLabel('FINAL VALUE (EUR)');
    await finalValueInput.fill('20.00');
    // Validation should show totals match
    await expect(page.getByText('✓ Totals match! Ready to settle.')).toBeVisible();

    // 8. Settle & show results
    await page.getByRole('button', { name: 'SETTLE & SHOW RESULTS' }).click();
    await expect(page.getByRole('heading', { name: 'SETTLEMENT RESULTS' })).toBeVisible();

    // 9. Verify net result is zero (player broke even)
    const playerHeading = page.getByRole('heading', { name: 'Test Player' });
    const playerBalance = playerHeading.locator('../..'); // move up to container
    await expect(playerBalance.locator('.text-3xl.font-pixel')).toHaveText('0.00 EUR');
    await expect(page.getByText('No transfers needed')).toBeVisible();

    // 10. Go to History and verify match appears
    await page.getByRole('link', { name: 'History' }).click();
    await expect(page.getByRole('heading', { name: 'MATCH HISTORY' })).toBeVisible();
    await expect(page.getByText('Match on')).toBeVisible();
    // Expand match details
    await page.getByText('Match on').first().click();
    await expect(page.getByRole('heading', { name: 'Test Player' })).toBeVisible();
  });

  test('two players settlement with transfers', async ({ page }) => {
    // Add two players
    await page.getByPlaceholder('e.g., Max').fill('Alice');
    await page.getByRole('button', { name: 'ADD PLAYER' }).click();
    await page.getByPlaceholder('e.g., Max').fill('Bob');
    await page.getByRole('button', { name: 'ADD PLAYER' }).click();

    // Start match with both players
    await page.getByRole('link', { name: 'New Match' }).click();
    await page.getByRole('button', { name: 'Alice' }).click();
    await page.getByRole('button', { name: 'Bob' }).click();
    await page.getByRole('button', { name: 'START MATCH' }).click();

    // Live match: proceed directly to cashout (no rebuys)
    await page.getByRole('button', { name: 'PROCEED TO CASHOUT' }).click();

    // Enter final values: Alice wins 5 EUR, Bob loses 5 EUR
    // Total paid-in: 10 + 10 = 20 EUR
    // Set Alice final = 15 EUR, Bob final = 5 EUR
    // Need to locate inputs within player rows. Use getByRole with name regex.
    // Each player row has a heading with player name.
    // We'll use page.getByRole('heading', { name: 'Alice' }).locator('..').getByLabel('FINAL VALUE (EUR)')
    // Simpler: use page.getByLabel('FINAL VALUE (EUR)').first() and .last() (order may be consistent)
    const finalValueInputs = page.getByLabel('FINAL VALUE (EUR)');
    await finalValueInputs.first().fill('15.00');
    await finalValueInputs.last().fill('5.00');

    // Validation should match (total final = 20)
    await expect(page.getByText('✓ Totals match! Ready to settle.')).toBeVisible();

    // Settle
    await page.getByRole('button', { name: 'SETTLE & SHOW RESULTS' }).click();

    // Verify net results: Alice +5, Bob -5
    await expect(page.getByRole('heading', { name: 'Alice' })).toBeVisible();
    const aliceHeading = page.getByRole('heading', { name: 'Alice' });
    const aliceBalance = aliceHeading.locator('../..');
    await expect(aliceBalance.locator('.text-3xl.font-pixel')).toHaveText('5.00 EUR');
    await expect(page.getByRole('heading', { name: 'Bob' })).toBeVisible();
    const bobHeading = page.getByRole('heading', { name: 'Bob' });
    const bobBalance = bobHeading.locator('../..');
    await expect(bobBalance.locator('.text-3xl.font-pixel')).toHaveText('-5.00 EUR');

    // Verify transfer: Bob → Alice 5 EUR
    const transfer = page.locator('.border.border-retro-gray.rounded-retro.p-4.bg-retro-dark').filter({ hasText: 'Bob' }).filter({ hasText: 'Alice' });
    await expect(transfer).toBeVisible();
    await expect(transfer.locator('.text-xl')).toBeVisible();
  });
});