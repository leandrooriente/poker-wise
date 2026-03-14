/* eslint-disable */
import { test, expect } from "@playwright/test";
import {
  addPlayer,
  fillCashoutValues,
  loginAdminAndCreateNamespacedGroup,
} from "./helpers";

test.describe("Basic poker match flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdminAndCreateNamespacedGroup(page);
  });

  test("canonical smoke: create players, settle match, and verify history", async ({
    page,
  }) => {
    // 1. Add two players
    await addPlayer(page, { name: "Test Player 1" });
    await addPlayer(page, { name: "Test Player 2" });

    // 2. Navigate to New Match
    await page.getByRole("link", { name: "New Match" }).click();
    await expect(
      page.getByRole("heading", { name: "NEW MATCH" })
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
    // Test Player 1 wins 5 EUR and Test Player 2 loses 5 EUR.
    await fillCashoutValues(page, {
      "Test Player 1": 25,
      "Test Player 2": 5,
    });
    // Validation should show totals match
    await expect(
      page.getByText("✓ Totals match! Ready to settle.")
    ).toBeVisible();

    // 8. Settle & show results
    await page.getByRole("button", { name: "SETTLE & SHOW RESULTS" }).click();
    await expect(
      page.getByRole("heading", { name: "SETTLEMENT RESULTS" })
    ).toBeVisible();

    // 9. Verify transfer state on results page
    const playerHeading1 = page.getByRole("heading", { name: "Test Player 1" });
    const playerBalance1 = playerHeading1.locator("../..");
    await expect(
      playerBalance1.locator('[data-testid="net-amount"]')
    ).toHaveText("5.00 EUR");
    const playerHeading2 = page.getByRole("heading", { name: "Test Player 2" });
    const playerBalance2 = playerHeading2.locator("../..");
    await expect(
      playerBalance2.locator('[data-testid="net-amount"]')
    ).toHaveText("5.00 EUR");
    await expect(playerBalance1.getByText("TO RECEIVE")).toBeVisible();
    await expect(playerBalance2.getByText("TO PAY")).toBeVisible();
    const transfer = page
      .getByTestId("transfer-item")
      .filter({ hasText: "Test Player 2" })
      .filter({ hasText: "Test Player 1" });
    await expect(transfer).toBeVisible();
    await expect(transfer.getByText("5.00 EUR")).toBeVisible();

    // 10. Go to History and verify match appears
    await page.getByRole("link", { name: "History" }).click();
    await expect(
      page.getByRole("heading", { name: "MATCH HISTORY" })
    ).toBeVisible();
    await expect(page.getByText("Match on")).toBeVisible();
    // Expand match details
    const historyEntry = page.getByTestId("match-entry").first();
    await historyEntry.getByRole("heading", { name: /Match on/ }).click();
    await expect(
      historyEntry.getByRole("heading", { name: "SETTLEMENT" })
    ).toBeVisible();
    await expect(
      historyEntry.getByRole("heading", { name: "Test Player 1" })
    ).toBeVisible();
    await expect(
      historyEntry.getByRole("heading", { name: "Test Player 2" })
    ).toBeVisible();
  });
});
