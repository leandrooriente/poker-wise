/* eslint-disable */
import { test, expect } from "@playwright/test";
import {
  seedNamespacedLocalStorage,
  fillCashoutValues,
  loginAdminAndCreateNamespacedGroup,
  generateNamespace,
  resolveSeededMatchId,
} from "./helpers";

test.describe("Cashout", () => {
  let namespace: string;

  test.beforeEach(async ({ page }) => {
    console.log("BeforeEach: clearing localStorage");
    // Generate a unique namespace for this test run
    namespace = generateNamespace();
    // Navigate to app origin to allow localStorage access, clear, then leave
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    // Seed default group and active group for groups-first UX with namespace
    await seedNamespacedLocalStorage(page, namespace, {});
    // Log in as admin and create a namespaced server group (required for admin UI)
    await loginAdminAndCreateNamespacedGroup(page);
    // Capture console logs from the page
    page.on("console", (msg) => console.log(`[page] ${msg.text()}`));
  });

  test("mismatch totals show invalid state and disable settlement", async ({
    page,
  }) => {
    // Setup a 2-player match
    const matchId = "cashout-test-1";
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Winner", createdAt: new Date().toISOString() },
        { id: "p2", name: "Loser", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          groupId: "home-game",
          buyInAmount: 1000,
          players: [
            { userId: "p1", buyIns: 1, finalValue: 0 },
            { userId: "p2", buyIns: 1, finalValue: 0 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/cashout?match=${resolveSeededMatchId(page, matchId)}`);
    await expect(page.getByRole("heading", { name: "CASHOUT" })).toBeVisible();

    // Total paid-in: 20.00 EUR (2 * 10)
    const validationSection = page
      .getByRole("heading", { name: "VALIDATION" })
      .locator("..");
    const paidInRow = validationSection
      .locator("div.flex.justify-between")
      .filter({ hasText: "Total paid‑in" });
    const amountSpan = paidInRow.locator("span").last();
    await expect(amountSpan).toHaveText("20.00 EUR");

    // Enter mismatched values: Winner 15, Loser 10 = 25 total (should mismatch by 5)
    await fillCashoutValues(page, {
      Winner: 15.0,
      Loser: 10.0,
    });

    // Should show error state
    await expect(
      validationSection.getByText("✗ Totals do not match. Adjust values.")
    ).toBeVisible();
    const differenceRow = validationSection
      .locator("div.flex.justify-between")
      .filter({ hasText: "Difference" });
    await expect(differenceRow.getByText("Difference")).toBeVisible();
    await expect(differenceRow.getByText("5.00 EUR")).toBeVisible(); // 25 - 20 = 5

    // Settle button should be disabled
    const settleButton = page.getByRole("button", {
      name: "SETTLE & SHOW RESULTS",
    });
    await expect(settleButton).toBeDisabled();
  });

  test("exact totals enable settlement", async ({ page }) => {
    const matchId = "cashout-test-2";
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "p2", name: "Bob", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          buyInAmount: 1000,
          players: [
            { userId: "p1", buyIns: 1, finalValue: 0 },
            { userId: "p2", buyIns: 1, finalValue: 0 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/cashout?match=${resolveSeededMatchId(page, matchId)}`);
    const validationSection = page
      .getByRole("heading", { name: "VALIDATION" })
      .locator("..");

    // Enter exact totals: Alice 12, Bob 8 = 20 total (matches paid-in)
    await fillCashoutValues(page, {
      Alice: 12.0,
      Bob: 8.0,
    });

    // Should show success state
    await expect(
      validationSection.getByText("✓ Totals match! Ready to settle.")
    ).toBeVisible();
    const differenceRow = validationSection
      .locator("div.flex.justify-between")
      .filter({ hasText: "Difference" });
    await expect(differenceRow.getByText("Difference")).toBeVisible();
    await expect(differenceRow.getByText("0.00 EUR")).toBeVisible();

    // Settle button should be enabled
    const settleButton = page.getByRole("button", {
      name: "SETTLE & SHOW RESULTS",
    });
    await expect(settleButton).toBeEnabled();

    // Click settle and navigate to results
    await settleButton.click();
    await expect(
      page.getByRole("heading", { name: "SETTLEMENT RESULTS" })
    ).toBeVisible();
  });

  test("cent values work correctly", async ({ page }) => {
    const matchId = "cashout-test-3";
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "p2", name: "Bob", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          groupId: "home-game",
          buyInAmount: 1000,
          players: [
            { userId: "p1", buyIns: 1, finalValue: 0 },
            { userId: "p2", buyIns: 1, finalValue: 0 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/cashout?match=${resolveSeededMatchId(page, matchId)}`);

    // Total paid-in: 20.00 EUR
    const validationSection = page
      .getByRole("heading", { name: "VALIDATION" })
      .locator("..");
    const paidInRow = validationSection
      .locator("div.flex.justify-between")
      .filter({ hasText: "Total paid‑in" });
    await expect(paidInRow.getByText("20.00 EUR").first()).toBeVisible();

    // Enter cent values
    await fillCashoutValues(page, {
      Alice: 11.25,
      Bob: 8.75,
    });

    // Should match exactly (11.25 + 8.75 = 20.00)
    await expect(
      validationSection.getByText("✓ Totals match! Ready to settle.")
    ).toBeVisible();
    const differenceRow = validationSection
      .locator("div.flex.justify-between")
      .filter({ hasText: "Difference" });
    await expect(differenceRow.getByText("Difference")).toBeVisible();
    await expect(differenceRow.getByText("0.00 EUR")).toBeVisible();

    // Verify net calculations show cents
    // Alice net: 11.25 - 10.00 = +1.25
    await expect(
      page
        .getByRole("heading", { name: "Alice" })
        .locator("..")
        .locator("..")
        .locator("div.text-left")
        .getByText("1.25 EUR")
    ).toBeVisible();
    // Bob net: 8.75 - 10.00 = -1.25
    await expect(
      page
        .getByRole("heading", { name: "Bob" })
        .locator("..")
        .locator("..")
        .locator("div.text-left")
        .getByText("-1.25 EUR")
    ).toBeVisible();
  });

  test("validation updates in real time as values change", async ({ page }) => {
    const matchId = "cashout-test-4";
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "p2", name: "Bob", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          buyInAmount: 1000,
          players: [
            { userId: "p1", buyIns: 1, finalValue: 0 },
            { userId: "p2", buyIns: 1, finalValue: 0 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/cashout?match=${resolveSeededMatchId(page, matchId)}`);
    const validationSection = page
      .getByRole("heading", { name: "VALIDATION" })
      .locator("..");

    // Ensure player headings are visible
    await expect(page.getByRole("heading", { name: "Alice" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bob" })).toBeVisible();

    // Start with empty values (0 + 0 = 0, mismatch by 20)
    await expect(
      validationSection.getByText("✗ Totals do not match. Adjust values.")
    ).toBeVisible();
    const differenceRow = validationSection
      .locator("div.flex.justify-between")
      .filter({ hasText: "Difference" });
    await expect(differenceRow.getByText("-20.00 EUR")).toBeVisible(); // 0 - 20 = -20

    // Fill first value
    await fillCashoutValues(page, { Alice: 12.5 });

    // Still mismatch: 12.50 + 0 = 12.50, diff = -7.50
    await expect(
      validationSection.getByText("✗ Totals do not match. Adjust values.")
    ).toBeVisible();
    await expect(differenceRow.getByText("-7.50 EUR")).toBeVisible();

    // Fill second value to match
    await fillCashoutValues(page, { Bob: 7.5 });

    // Should match now
    await expect(
      validationSection.getByText("✓ Totals match! Ready to settle.")
    ).toBeVisible();
    await expect(differenceRow.getByText("0.00 EUR")).toBeVisible();
  });

  test("single player cashout (break-even)", async ({ page }) => {
    const matchId = "cashout-test-5";
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Solo", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          groupId: "home-game",
          buyInAmount: 1000,
          players: [
            { userId: "p1", buyIns: 3, finalValue: 0 }, // 30.00 paid
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/cashout?match=${resolveSeededMatchId(page, matchId)}`);

    // Enter exact value
    await fillCashoutValues(page, {
      Solo: 30.0,
    });

    await expect(
      page.getByText("✓ Totals match! Ready to settle.")
    ).toBeVisible();
    await expect(
      page
        .getByRole("heading", { name: "Solo" })
        .locator("..")
        .locator("..")
        .locator("div.text-left")
        .getByText("0.00 EUR")
    ).toBeVisible(); // net zero
  });

  test("error state when match not found", async ({ page }) => {
    await page.goto("/cashout?match=invalid-id");

    await expect(page.getByRole("heading", { name: "ERROR" })).toBeVisible();
    await expect(page.getByText("Match not found")).toBeVisible();

    // Should have button to start new match
    await page.getByRole("button", { name: "Start New Match" }).click();
    await expect(
      page.getByRole("heading", { name: "NEW MATCH" })
    ).toBeVisible();
  });

  test("proceeds to results after settlement", async ({ page }) => {
    const matchId = "cashout-test-6";
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Winner", createdAt: new Date().toISOString() },
        { id: "p2", name: "Loser", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          groupId: "home-game",
          buyInAmount: 1000,
          players: [
            { userId: "p1", buyIns: 1, finalValue: 0 },
            { userId: "p2", buyIns: 1, finalValue: 0 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/cashout?match=${resolveSeededMatchId(page, matchId)}`);

    // Ensure player headings are visible
    await expect(page.getByRole("heading", { name: "Winner" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Loser" })).toBeVisible();

    // Setup a clear win/loss: Winner 15, Loser 5
    await fillCashoutValues(page, {
      Winner: 15.0,
      Loser: 5.0,
    });

    // Wait for validation to show success
    const validationSection = page
      .getByRole("heading", { name: "VALIDATION" })
      .locator("..");
    await expect(
      validationSection.getByText("✓ Totals match! Ready to settle.")
    ).toBeVisible();

    // Settle
    await page.getByRole("button", { name: "SETTLE & SHOW RESULTS" }).click();

    // Should be on results page with settlement
    await expect(
      page.getByRole("heading", { name: "SETTLEMENT RESULTS" })
    ).toBeVisible();
    const balancesSection = page
      .getByRole("heading", { name: "PLAYER BALANCES" })
      .locator("..");
    await expect(balancesSection.getByText("Winner")).toBeVisible();
    await expect(balancesSection.getByText("Loser")).toBeVisible();
    const winnerBalance = page
      .getByRole("heading", { name: "Winner" })
      .locator("../..");
    await expect(winnerBalance.locator('[data-testid="net-amount"]')).toHaveText(
      "5.00 EUR"
    );
    const loserBalance = page
      .getByRole("heading", { name: "Loser" })
      .locator("../..");
    await expect(loserBalance.locator('[data-testid="net-amount"]')).toHaveText(
      "5.00 EUR"
    );
    await expect(winnerBalance.getByText("TO RECEIVE")).toBeVisible();
    await expect(loserBalance.getByText("TO PAY")).toBeVisible();
  });
});
