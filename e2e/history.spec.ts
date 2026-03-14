/* eslint-disable */
import { test, expect } from "@playwright/test";
import {
  seedNamespacedLocalStorage,
  loginAdminAndCreateNamespacedGroup,
  generateNamespace,
  openLatestHistoryMatch,
} from "./helpers";

test.describe("History Page", () => {
  let namespace: string;

  test.beforeEach(async ({ page }) => {
    namespace = generateNamespace();
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

  test("history persists after reload", async ({ page }) => {
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "p2", name: "Bob", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: "persisted-match",
          buyInAmount: 1000,
          players: [
            { userId: "p1", buyIns: 1, finalValue: 1250 },
            { userId: "p2", buyIns: 1, finalValue: 750 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto("/history");

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

  test("delete button removes match from history after confirmation", async ({
    page,
  }) => {
    page.on("console", (msg) => console.log("PAGE:", msg.type(), msg.text()));
    page.on("pageerror", (error) => console.log("PAGE ERROR:", error.message));
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "p2", name: "Bob", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: "match-to-delete",
          title: "Match to Delete",
          buyInAmount: 1000,
          players: [
            { userId: "p1", buyIns: 1, finalValue: 1500 },
            { userId: "p2", buyIns: 1, finalValue: 500 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: "match-keep",
          title: "Match to Keep",
          buyInAmount: 1000,
          players: [
            { userId: "p1", buyIns: 1, finalValue: 1000 },
            { userId: "p2", buyIns: 1, finalValue: 1000 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto("/history");
    const matchEntries = page.getByTestId("match-entry");
    await expect(matchEntries).toHaveCount(2);

    // Expand the match we want to delete (by title)
    const matchToDelete = matchEntries.filter({ hasText: "Match to Delete" });
    await expect(matchToDelete).toBeVisible();
    await matchToDelete.click();
    const firstMatch = matchToDelete;
    await expect(
      firstMatch.getByRole("heading", { name: "SETTLEMENT" })
    ).toBeVisible();

    // Find and click DELETE button
    // Check SHARE button also exists
    await expect(
      firstMatch.getByRole("button", { name: "SHARE" })
    ).toBeVisible();
    const deleteButton = firstMatch.getByTestId("delete-button");
    await expect(deleteButton).toBeVisible();

    // Register dialog handler BEFORE clicking (Playwright best practice)
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });
    await deleteButton.click();

    // Wait for deletion to complete
    await page.waitForTimeout(500);

    // Should now have only 1 match left
    await expect(matchEntries).toHaveCount(1);
    await expect(matchEntries.getByText("Match to Keep")).toBeVisible();
    await expect(matchEntries.getByText("Match to Delete")).not.toBeVisible();
  });
});
