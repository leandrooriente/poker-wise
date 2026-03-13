import { test, expect } from "@playwright/test";
import {
  seedNamespacedLocalStorage,
  fillCashoutValues,
  loginAdminAndCreateNamespacedGroup,
  generateNamespace,
  addRebuy,
} from "./helpers";

test.describe("Results Page", () => {
  let namespace: string;

  test.beforeEach(async ({ page }) => {
    // Generate a unique namespace for this test run
    namespace = generateNamespace();
    // Navigate to app origin to allow localStorage access, clear, then leave
    await page.goto("/history");
    await page.evaluate(() => window.localStorage.clear());
    // Seed default group and active group for groups-first UX with namespace
    await seedNamespacedLocalStorage(page, namespace, {});
    // Log in as admin and create a namespaced server group (required for admin UI)
    await loginAdminAndCreateNamespacedGroup(page);
    await page.goto("about:blank");
  });

  test("break‑even shows no transfers", async ({ page }) => {
    const matchId = "break-even-match";
    // Two players, each with 1 buy‑in, final value equals paid‑in
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "p2", name: "Bob", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          buyInAmount: 1000, // 10.00 EUR
          players: [
            { userId: "p1", buyIns: 1, finalValue: 1000 }, // 10.00
            { userId: "p2", buyIns: 1, finalValue: 1000 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/results?match=${matchId}`);
    await expect(
      page.getByRole("heading", { name: "SETTLEMENT RESULTS" })
    ).toBeVisible();
    await expect(page.getByText("PLAYER BALANCES")).toBeVisible();

    // Both players show net zero
    await expect(page.getByRole("heading", { name: "Alice" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bob" })).toBeVisible();
    const aliceBalance = page
      .getByRole("heading", { name: "Alice" })
      .locator("../..");
    await expect(aliceBalance.locator(".text-5xl.font-pixel")).toHaveText(
      "0.00 EUR"
    );
    const bobBalance = page
      .getByRole("heading", { name: "Bob" })
      .locator("../..");
    await expect(bobBalance.locator(".text-5xl.font-pixel")).toHaveText(
      "0.00 EUR"
    );

    // No transfers section shows empty message
    await expect(
      page.getByText("No transfers needed — all players break even.")
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "TRANSFERS" })
    ).toBeVisible();
  });

  test("single transfer shows one payment", async ({ page }) => {
    const matchId = "single-transfer-match";
    // Alice wins 10 EUR, Bob loses 10 EUR
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
            { userId: "p1", buyIns: 1, finalValue: 2000 }, // paid 10, final 20 → net +10
            { userId: "p2", buyIns: 1, finalValue: 0 }, // paid 10, final 0 → net -10
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/results?match=${matchId}`);

    // Verify player balances display correct net amounts
    await expect(page.getByRole("heading", { name: "Alice" })).toBeVisible();
    const aliceBalance = page
      .getByRole("heading", { name: "Alice" })
      .locator("../..");
    await expect(aliceBalance.locator(".text-5xl.font-pixel")).toHaveText(
      "10.00 EUR"
    );
    await expect(page.getByRole("heading", { name: "Bob" })).toBeVisible();
    const bobBalance = page
      .getByRole("heading", { name: "Bob" })
      .locator("../..");
    await expect(bobBalance.locator(".text-5xl.font-pixel")).toHaveText(
      "10.00 EUR"
    );
    await expect(bobBalance.getByText("TO PAY")).toBeVisible();

    // One transfer from Bob to Alice of 10.00 EUR
    await expect(
      page.getByRole("heading", { name: "TRANSFERS" })
    ).toBeVisible();
    const transferItems = page.getByTestId("transfer-item");
    await expect(transferItems).toHaveCount(1);
    await expect(transferItems.getByText("Bob")).toBeVisible();
    await expect(transferItems.getByText("Alice")).toBeVisible();
    await expect(transferItems.getByText("10.00 EUR").first()).toBeVisible();
  });

  test("multi‑player transfers show minimized payments", async ({ page }) => {
    const matchId = "multi-transfer-match";
    // Three players with different nets:
    // Alice: +15 EUR (creditor)
    // Bob: -10 EUR (debtor)
    // Charlie: -5 EUR (debtor)
    // Expect one transfer Bob→Alice 10, one Charlie→Alice 5
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "p2", name: "Bob", createdAt: new Date().toISOString() },
        { id: "p3", name: "Charlie", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          buyInAmount: 1000,
          players: [
            { userId: "p1", buyIns: 2, finalValue: 3500 }, // paid 20, final 35 → net +15
            { userId: "p2", buyIns: 1, finalValue: 0 }, // paid 10, final 0 → net -10
            { userId: "p3", buyIns: 1, finalValue: 500 }, // paid 10, final 5 → net -5
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/results?match=${matchId}`);

    // Verify net amounts
    await expect(page.getByRole("heading", { name: "Alice" })).toBeVisible();
    const aliceBalance = page
      .getByRole("heading", { name: "Alice" })
      .locator("../..");
    await expect(aliceBalance.locator(".text-5xl.font-pixel")).toHaveText(
      "15.00 EUR"
    );
    await expect(page.getByRole("heading", { name: "Bob" })).toBeVisible();
    const bobBalance = page
      .getByRole("heading", { name: "Bob" })
      .locator("../..");
    await expect(bobBalance.locator(".text-5xl.font-pixel")).toHaveText(
      "10.00 EUR"
    );
    await expect(page.getByRole("heading", { name: "Charlie" })).toBeVisible();
    const charlieBalance = page
      .getByRole("heading", { name: "Charlie" })
      .locator("../..");
    await expect(charlieBalance.locator(".text-5xl.font-pixel")).toHaveText(
      "5.00 EUR"
    );
    await expect(aliceBalance.getByText("TO RECEIVE")).toBeVisible();
    await expect(bobBalance.getByText("TO PAY")).toBeVisible();
    await expect(charlieBalance.getByText("TO PAY")).toBeVisible();

    // Two transfers, Bob→Alice 10.00 and Charlie→Alice 5.00
    await expect(
      page.getByRole("heading", { name: "TRANSFERS" })
    ).toBeVisible();
    const transferItems = page.getByTestId("transfer-item");
    await expect(transferItems).toHaveCount(2);
    const transfer10 = transferItems.filter({
      has: page.getByText("10.00 EUR"),
    });
    const transfer5 = transferItems.filter({ has: page.getByText("5.00 EUR") });
    await expect(transfer10).toHaveCount(1);
    await expect(transfer5).toHaveCount(1);
    await expect(transfer10.getByText("Bob")).toBeVisible();
    await expect(transfer10.getByText("Alice")).toBeVisible();
    await expect(transfer5.getByText("Charlie")).toBeVisible();
    await expect(transfer5.getByText("Alice")).toBeVisible();
  });

  test("full flow from cashout to results", async ({ page }) => {
    // Use UI to add players, start match, add rebuys, enter cashout, settle
    // This test validates the entire user journey.
    // We'll use the helpers for each step.
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "p2", name: "Bob", createdAt: new Date().toISOString() },
      ],
    });

    // Navigate to new match, select players, start
    await page.goto("/new-match");
    await page.locator("label", { hasText: "Alice" }).click();
    await page.locator("label", { hasText: "Bob" }).click();
    await page.getByRole("button", { name: "START MATCH" }).click();

    // Live match page: add one rebuy for Alice
    await expect(
      page.getByRole("heading", { name: "LIVE MATCH" })
    ).toBeVisible();
    await addRebuy(page, "Alice", 1);

    // Navigate to cashout
    await page.getByRole("button", { name: "CASHOUT" }).click();
    await expect(page.getByRole("heading", { name: "CASHOUT" })).toBeVisible();

    // Enter final values that match total paid‑in:
    // Alice: 2 buy‑ins = 20 EUR paid in, Bob: 1 buy‑in = 10 EUR paid in
    // Total paid‑in = 30 EUR. Distribute as Alice 25, Bob 5 (Alice profit 5, Bob loss 5)
    await fillCashoutValues(page, { Alice: 25.0, Bob: 5.0 });

    // Validation should pass
    const validationMessage = page.getByTestId("validation-message");
    await expect(validationMessage).toBeVisible();
    await expect(validationMessage).toHaveText(
      "✓ Totals match! Ready to settle."
    );

    // Click settle button
    await page.getByRole("button", { name: "SETTLE & SHOW RESULTS" }).click();

    // Results page should load
    await expect(
      page.getByRole("heading", { name: "SETTLEMENT RESULTS" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Alice" })).toBeVisible();
    const aliceBalance = page
      .getByRole("heading", { name: "Alice" })
      .locator("../..");
    await expect(aliceBalance.locator(".text-5xl.font-pixel")).toHaveText(
      "5.00 EUR"
    );
    await expect(page.getByRole("heading", { name: "Bob" })).toBeVisible();
    const bobBalance = page
      .getByRole("heading", { name: "Bob" })
      .locator("../..");
    await expect(bobBalance.locator(".text-5xl.font-pixel")).toHaveText(
      "5.00 EUR"
    );
    await expect(aliceBalance.getByText("TO RECEIVE")).toBeVisible();
    await expect(bobBalance.getByText("TO PAY")).toBeVisible();
    // One transfer Bob → Alice 5.00 EUR
    await expect(
      page.getByRole("heading", { name: "TRANSFERS" })
    ).toBeVisible();
    const transferItems = page.getByTestId("transfer-item");
    await expect(transferItems).toHaveCount(1);
    await expect(transferItems.getByText("Bob")).toBeVisible();
    await expect(transferItems.getByText("Alice")).toBeVisible();
    await expect(transferItems.getByText("5.00 EUR").first()).toBeVisible();
  });

  test("share button opens WhatsApp with formatted message", async ({ page }) => {
    const matchId = "share-test-match";
    // Three players with known nets
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "a", name: "Alice", createdAt: new Date().toISOString() },
        { id: "b", name: "Bob", createdAt: new Date().toISOString() },
        { id: "c", name: "Charlie", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          buyInAmount: 1000,
          players: [
            { userId: "a", buyIns: 1, finalValue: 2500 },
            { userId: "c", buyIns: 1, finalValue: 500 },
            { userId: "b", buyIns: 2, finalValue: 1000 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: "2026-03-13T20:00:00.000Z",
        },
      ],
    });

    // Stub window.open before navigation
    await page.addInitScript(() => {
      (window as any).__lastOpenUrl = "";
      window.open = (url: string, target?: string, features?: string) => {
        (window as any).__lastOpenUrl = url;
        return null;
      };
    });

    await page.goto(`/results?match=${matchId}`);
    await expect(page.getByRole("heading", { name: "SETTLEMENT RESULTS" })).toBeVisible();
    await expect(page.getByRole("button", { name: "SHARE" })).toBeVisible();

    // Click Share button
    await page.getByRole("button", { name: "SHARE" }).click();

    // Retrieve captured URL
    const capturedUrl = await page.evaluate(() => (window as any).__lastOpenUrl);
    expect(capturedUrl).toBeDefined();
    expect(capturedUrl).toMatch(/^https:\/\/wa\.me\/\?text=/);
    const encodedText = capturedUrl.replace("https://wa.me/?text=", "");
    const decodedText = decodeURIComponent(encodedText);

    // Verify date line
    expect(decodedText).toContain("13 Mar 2026");
    // Verify results section
    expect(decodedText).toContain("Results:");
    expect(decodedText).toContain("1. Alice: +15.00 EUR (1 buy-in)");
    expect(decodedText).toContain("2. Charlie: -5.00 EUR (1 buy-in)");
    expect(decodedText).toContain("3. Bob: -10.00 EUR (2 buy-ins)");
    // Verify transfers section
    expect(decodedText).toContain("Transfers:");
    expect(decodedText).toContain("Bob -> Alice: 10.00 EUR");
    expect(decodedText).toContain("Charlie -> Alice: 5.00 EUR");
  });
});
