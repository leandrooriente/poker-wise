/* eslint-disable */
import { test, expect } from "@playwright/test";
import {
  seedNamespacedLocalStorage,
  openLatestHistoryMatch,
  fillCashoutValues,
  loginAdminAndCreateNamespacedGroup,
  generateNamespace,
} from "./helpers";

test.describe("History Page", () => {
  let namespace: string;

  test.beforeEach(async ({ page }) => {
    // Generate a unique namespace for this test run
    namespace = generateNamespace();

    // Navigate to app origin to allow localStorage access, clear
    await page.goto("/history");
    await page.evaluate(() => window.localStorage.clear());
    // Seed default group and active group for groups-first UX with namespace
    await seedNamespacedLocalStorage(page, namespace, {});
    // Log in as admin and create a namespaced server group (required for admin UI)
    await loginAdminAndCreateNamespacedGroup(page);
  });

  test("empty state shows no matches message", async ({ page }) => {
    await page.goto("/history");
    await expect(
      page.getByRole("heading", { name: "MATCH HISTORY" })
    ).toBeVisible();
    await expect(page.getByText("No matches yet.")).toBeVisible();
    await expect(
      page.getByText('Start a new match from the "New Match" tab')
    ).toBeVisible();
  });

  test("match list shows matches sorted newest first", async ({ page }) => {
    // Create three matches with different createdAt dates
    const oldMatch = new Date("2026-03-01T12:00:00Z").toISOString();
    const middleMatch = new Date("2026-03-05T15:30:00Z").toISOString();
    const newestMatch = new Date("2026-03-09T18:45:00Z").toISOString();

    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "p2", name: "Bob", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: "match-old",
          title: "Old Match",
          buyInAmount: 1000,
          players: [
            { userId: "p1", buyIns: 1, finalValue: 1000 },
            { userId: "p2", buyIns: 1, finalValue: 1000 },
          ],
          startedAt: oldMatch,
          createdAt: oldMatch,
        },
        {
          id: "match-middle",
          title: "Middle Match",
          buyInAmount: 1500,
          players: [{ userId: "p1", buyIns: 2, finalValue: 3000 }],
          startedAt: middleMatch,
          createdAt: middleMatch,
        },
        {
          id: "match-newest",
          title: "Newest Match",
          buyInAmount: 1000,
          players: [
            { userId: "p1", buyIns: 1, finalValue: 2000 },
            { userId: "p2", buyIns: 1, finalValue: 0 },
          ],
          startedAt: newestMatch,
          createdAt: newestMatch,
        },
      ],
    });

    await page.goto("/history");
    await expect(
      page.getByRole("heading", { name: "MATCH HISTORY" })
    ).toBeVisible();

    // Expect three match entries
    const matchEntries = page.getByTestId("match-entry");
    await expect(matchEntries).toHaveCount(3);

    // Entries should be newest first based on API creation order.
    await expect(matchEntries.nth(0)).toContainText("Newest Match");
    await expect(matchEntries.nth(1)).toContainText("Middle Match");
    await expect(matchEntries.nth(2)).toContainText("Old Match");

    // Verify each match shows buy‑in and pot
    await expect(page.getByText("Buy‑in: 10.00 EUR")).toHaveCount(2); // old and newest
    await expect(page.getByText("Buy‑in: 15.00 EUR")).toHaveCount(1); // middle match
    await expect(page.getByText("Pot: 20.00 EUR").first()).toBeVisible(); // old match
    await expect(page.getByText("Pot: 30.00 EUR")).toBeVisible(); // middle match (2 buy-ins * 15)
    await expect(page.getByText("Pot: 20.00 EUR")).toHaveCount(2); // newest also 20
  });

  test("clicking match expands details", async ({ page }) => {
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "p2", name: "Bob", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: "test-match",
          buyInAmount: 1000,
          players: [
            { userId: "p1", buyIns: 1, finalValue: 1500 },
            { userId: "p2", buyIns: 1, finalValue: 500 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto("/history");
    const matchEntry = page.getByTestId("match-entry").first();
    // Initially not expanded (no SETTLEMENT heading)
    await expect(
      matchEntry.getByRole("heading", { name: "SETTLEMENT" })
    ).not.toBeVisible();

    // Click to expand
    await matchEntry.click();
    await expect(
      matchEntry.getByRole("heading", { name: "SETTLEMENT" })
    ).toBeVisible();
    await expect(
      matchEntry.getByRole("heading", { name: "PLAYER DETAILS" })
    ).toBeVisible();

    // Click again to collapse
    await matchEntry.click();
    await expect(
      matchEntry.getByRole("heading", { name: "SETTLEMENT" })
    ).not.toBeVisible();
  });

  test("expanded details show player balances and transfers", async ({
    page,
  }) => {
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "p2", name: "Bob", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: "test-match",
          buyInAmount: 1000,
          players: [
            { userId: "p1", buyIns: 1, finalValue: 1500 },
            { userId: "p2", buyIns: 1, finalValue: 500 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto("/history");
    const matchEntry = page.getByTestId("match-entry").first();
    await matchEntry.click();

    // Balances section
    const balancesSection = matchEntry
      .getByRole("heading", { name: "Balances" })
      .locator("..");

    await expect(balancesSection.getByText("Alice")).toBeVisible();
    await expect(balancesSection.getByText("Bob")).toBeVisible();
    await expect(
      balancesSection
        .locator("li")
        .filter({ hasText: "Alice" })
        .getByText("5.00 EUR")
    ).toBeVisible(); // Alice net +5
    await expect(
      balancesSection
        .locator("li")
        .filter({ hasText: "Bob" })
        .getByText("-5.00 EUR")
    ).toBeVisible(); // Bob net -5

    // Transfers section
    const transfersSection = matchEntry
      .getByRole("heading", { name: "Transfers" })
      .locator("..");
    await expect(transfersSection.getByText("Bob → Alice")).toBeVisible();
    await expect(transfersSection.getByText("5.00 EUR")).toBeVisible();

    // Player details headings
    await expect(
      matchEntry.getByRole("heading", { name: "PLAYER DETAILS" })
    ).toBeVisible();
    await expect(matchEntry.getByText("Buy‑ins:").first()).toBeVisible();
    await expect(matchEntry.getByText("Final value:").first()).toBeVisible();
    await expect(matchEntry.getByText("Paid in:").first()).toBeVisible();
    await expect(matchEntry.getByText("Net result:").first()).toBeVisible();
  });

  test("share button opens WhatsApp with formatted message", async ({ page }) => {
    const matchId = "share-test-match-history";
    // Three players with known nets (same as results share test)
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
      window.open = (url?: string | URL, target?: string, features?: string) => {
        (window as any).__lastOpenUrl = url?.toString() || "";
        return null;
      };
    });

    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "MATCH HISTORY" })).toBeVisible();

    // Expand the match
    const matchEntry = page.getByTestId("match-entry").first();
    await expect(matchEntry.getByRole("button", { name: "SHARE" })).toHaveCount(0);
    await matchEntry.click();

    // Wait for expanded content
    await expect(matchEntry.getByRole("heading", { name: "SETTLEMENT" })).toBeVisible();

    // Find and click the SHARE button inside the expanded match
    const shareButton = matchEntry.getByRole("button", { name: "SHARE" });
    await expect(shareButton).toBeVisible();
    await shareButton.click();

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

  test("history persists after reload", async ({ page }) => {
    // Add a match via UI (using helpers) and verify it appears after reload
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "p2", name: "Bob", createdAt: new Date().toISOString() },
      ],
    });

    // Create a match via UI steps
    await page.goto("/new-match");
    await page.locator("label", { hasText: "Alice" }).click();
    await page.locator("label", { hasText: "Bob" }).click();
    await page.getByRole("button", { name: "START MATCH" }).click();

    // Live match: immediate cashout
    await page.getByRole("button", { name: "CASHOUT" }).click();
    // Fill values (match total paid-in = 20)
    await fillCashoutValues(page, { Alice: 12.5, Bob: 7.5 });

    await page.getByRole("button", { name: "SETTLE & SHOW RESULTS" }).click();
    // Results page: we can go to history
    await page.getByRole("button", { name: "VIEW HISTORY" }).click();

    // Should see the match in history
    await expect(
      page.getByRole("heading", { name: "MATCH HISTORY" })
    ).toBeVisible();
    const matchEntry = page.getByTestId("match-entry");
    await expect(matchEntry).toBeVisible();
    await expect(matchEntry.getByText("Match on")).toBeVisible();

    // Reload page
    await page.reload();

    await expect(
      page.getByRole("heading", { name: "MATCH HISTORY" })
    ).toBeVisible();
    await expect(page.getByTestId("match-entry")).toBeVisible();
    await expect(
      page.getByTestId("match-entry").getByText("Match on")
    ).toBeVisible(); // still there
  });

  test("openLatestHistoryMatch helper works", async ({ page }) => {
    // Seed two matches, helper should open the newest
    const oldMatch = new Date("2026-03-01T12:00:00Z").toISOString();
    const newMatch = new Date("2026-03-09T18:45:00Z").toISOString();

    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "p2", name: "Bob", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: "old",
          title: "Old Match",
          buyInAmount: 1000,
          players: [
            { userId: "p1", buyIns: 1, finalValue: 1000 },
            { userId: "p2", buyIns: 1, finalValue: 1000 },
          ],
          startedAt: oldMatch,
          createdAt: oldMatch,
        },
        {
          id: "new",
          title: "Newest Match",
          buyInAmount: 1500,
          players: [{ userId: "p1", buyIns: 2, finalValue: 3000 }],
          startedAt: newMatch,
          createdAt: newMatch,
        },
      ],
    });

    await openLatestHistoryMatch(page);
    // Should have expanded the newest match.
    const matchEntry = page.getByTestId("match-entry").first();
    await expect(matchEntry.getByText("Newest Match")).toBeVisible();
    await expect(matchEntry.getByText("SETTLEMENT")).toBeVisible(); // expanded
    // Verify it's the correct match (buy‑in 15.00)
    await expect(page.getByText("Buy‑in: 15.00 EUR")).toBeVisible();
  });
});
