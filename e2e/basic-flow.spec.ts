/* eslint-disable */
import { test, expect } from "@playwright/test";
import { addPlayer, loginAdminAndCreateNamespacedGroup } from "./helpers";

test.describe("Basic poker match flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/history");
    await page.evaluate(() => window.localStorage.clear());

    await loginAdminAndCreateNamespacedGroup(page);

    page.on("console", (msg) => console.log(`[page] ${msg.text()}`));
  });

  test("complete match flow: add player, start match, rebuy, cashout, settle", async ({
    page,
  }) => {
    // 1. Add two players
    await addPlayer(page, { name: "Test Player 1" });
    await addPlayer(page, { name: "Test Player 2" });

    // 2. Navigate to New Match
    await page.getByRole("link", { name: "New Match" }).click();
    await expect(
      page.getByRole("heading", { name: "NEW MATCH SETUP" })
    ).toBeVisible();

    // 3. Select both players
    await page.locator("label", { hasText: "Test Player 1" }).click();
    await page.locator("label", { hasText: "Test Player 2" }).click();
    // Buy-in amount default 10 EUR, keep as is
    await page.getByRole("button", { name: "START MATCH" }).click();

    // 4. Should be on Live Match page
    await expect(
      page.getByRole("heading", { name: "LIVE MATCH" })
    ).toBeVisible();
    await expect(page.getByText("Test Player 1")).toBeVisible();
    await expect(page.getByText("Test Player 2")).toBeVisible();

    // 5. Add a rebuy for Test Player 1
    const playerRow1 = page
      .getByTestId("player-row")
      .filter({ hasText: "Test Player 1" });
    await playerRow1.getByRole("button", { name: "REBUY" }).click();
    await expect(
      playerRow1.locator("span.font-pixel.text-retro-yellow.text-2xl")
    ).toHaveText("2");

    // 6. Proceed to cashout
    await page.getByRole("button", { name: "PROCEED TO CASHOUT" }).click();
    await expect(page.getByRole("heading", { name: "CASHOUT" })).toBeVisible();

    // 7. Enter final chip values (total pot = 3 buy-ins = 30 EUR)
    // Distribute according to paid-in: Test Player 1 paid 20 EUR, Test Player 2 paid 10 EUR
    const finalValueInputs = page.getByLabel("FINAL VALUE");
    await finalValueInputs.first().fill("20.00");
    await finalValueInputs.last().fill("10.00");
    // Validation should show totals match
    await expect(
      page.getByText("✓ Totals match! Ready to settle.")
    ).toBeVisible();

    // 8. Settle & show results
    await page.getByRole("button", { name: "SETTLE & SHOW RESULTS" }).click();
    await expect(
      page.getByRole("heading", { name: "SETTLEMENT RESULTS" })
    ).toBeVisible();

    // 9. Verify net result is zero for both players (break even)
    const playerHeading1 = page.getByRole("heading", { name: "Test Player 1" });
    const playerBalance1 = playerHeading1.locator("../..");
    await expect(playerBalance1.locator(".text-5xl.font-pixel")).toHaveText(
      "0.00 EUR"
    );
    const playerHeading2 = page.getByRole("heading", { name: "Test Player 2" });
    const playerBalance2 = playerHeading2.locator("../..");
    await expect(playerBalance2.locator(".text-5xl.font-pixel")).toHaveText(
      "0.00 EUR"
    );
    await expect(page.getByText("No transfers needed")).toBeVisible();

    // 10. Go to History and verify match appears
    await page.getByRole("link", { name: "History" }).click();
    await expect(
      page.getByRole("heading", { name: "MATCH HISTORY" })
    ).toBeVisible();
    await expect(page.getByText("Match on")).toBeVisible();
    // Expand match details
    await page.getByText("Match on").first().click();
    await expect(
      page.getByRole("heading", { name: "Test Player 1" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Test Player 2" })
    ).toBeVisible();
  });

  test("two players settlement with transfers", async ({ page }) => {
    // Add two players
    await addPlayer(page, { name: "Alice" });
    await addPlayer(page, { name: "Bob" });

    // Start match with both players
    await page.getByRole("link", { name: "New Match" }).click();
    await page.locator("label", { hasText: "Alice" }).click();
    await page.locator("label", { hasText: "Bob" }).click();
    await page.getByRole("button", { name: "START MATCH" }).click();

    // Live match: proceed directly to cashout (no rebuys)
    await page.getByRole("button", { name: "PROCEED TO CASHOUT" }).click();

    // Enter final values: Alice wins 5 EUR, Bob loses 5 EUR
    // Total paid-in: 10 + 10 = 20 EUR
    // Set Alice final = 15 EUR, Bob final = 5 EUR
    // Need to locate inputs within player rows. Use getByRole with name regex.
    // Each player row has a heading with player name.
    // We'll use page.getByRole('heading', { name: 'Alice' }).locator('..').getByLabel('FINAL VALUE')
    // Simpler: use page.getByLabel('FINAL VALUE').first() and .last() (order may be consistent)
    const finalValueInputs = page.getByLabel("FINAL VALUE");
    await finalValueInputs.first().fill("15.00");
    await finalValueInputs.last().fill("5.00");

    // Validation should match (total final = 20)
    await expect(
      page.getByText("✓ Totals match! Ready to settle.")
    ).toBeVisible();

    // Settle
    await page.getByRole("button", { name: "SETTLE & SHOW RESULTS" }).click();

    // Verify net results: Alice +5, Bob -5
    await expect(page.getByRole("heading", { name: "Alice" })).toBeVisible();
    const aliceHeading = page.getByRole("heading", { name: "Alice" });
    const aliceBalance = aliceHeading.locator("../..");
    await expect(aliceBalance.locator(".text-5xl.font-pixel")).toHaveText(
      "5.00 EUR"
    );
    await expect(page.getByRole("heading", { name: "Bob" })).toBeVisible();
    const bobHeading = page.getByRole("heading", { name: "Bob" });
    const bobBalance = bobHeading.locator("../..");
    await expect(bobBalance.locator(".text-5xl.font-pixel")).toHaveText(
      "-5.00 EUR"
    );

    // Verify transfer: Bob → Alice 5 EUR
    const transfer = page
      .getByTestId("transfer-item")
      .filter({ hasText: "Bob" })
      .filter({ hasText: "Alice" });
    await expect(transfer).toBeVisible();
    await expect(transfer.getByText("5.00 EUR")).toBeVisible();
  });
});
