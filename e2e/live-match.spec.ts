import { test, expect } from "@playwright/test";
import {
  seedNamespacedLocalStorage,
  addRebuy,
  getTotalPotText,
  loginAdminAndCreateNamespacedGroup,
  generateNamespace,
} from "./helpers";

test.describe("Live Match", () => {
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

  test("multiple rebuys for one player", async ({ page }) => {
    // Seed a match with one player
    const matchId = "test-match-1";
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Alice", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          title: "Test Match",
          buyInAmount: 1000, // 10.00 EUR
          players: [{ userId: "p1", buyIns: 1, finalValue: 0 }],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/live-match?match=${matchId}`);
    await expect(
      page.getByRole("heading", { name: "LIVE MATCH" })
    ).toBeVisible();

    // Initial state
    await expect(page.getByText("Alice")).toBeVisible();
    await expect(page.getByText("Buy‑ins: 1")).toBeVisible();
    expect(await getTotalPotText(page)).toBe("10.00 EUR");

    // Add two rebuys
    await addRebuy(page, "Alice", 2);

    // Verify updates
    await expect(page.getByText("Buy‑ins: 3")).toBeVisible();
    await expect(page.getByText("Total paid: 30.00 EUR")).toBeVisible();
    expect(await getTotalPotText(page)).toBe("30.00 EUR");
  });

  test("rebuys across multiple players", async ({ page }) => {
    // Seed a match with three players
    const matchId = "test-match-2";
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "p2", name: "Bob", createdAt: new Date().toISOString() },
        { id: "p3", name: "Charlie", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          title: "Three Player Match",
          buyInAmount: 1000,
          players: [
            { userId: "p1", buyIns: 1, finalValue: 0 },
            { userId: "p2", buyIns: 1, finalValue: 0 },
            { userId: "p3", buyIns: 1, finalValue: 0 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/live-match?match=${matchId}`);

    // Initial total pot: 3 * 10 = 30 EUR
    expect(await getTotalPotText(page)).toBe("30.00 EUR");

    // Add rebuys: Alice 2, Bob 1, Charlie 0
    await addRebuy(page, "Alice", 2);
    await addRebuy(page, "Bob", 1);

    // Verify individual buy-ins
    await expect(
      page.getByText("Alice").locator("..").getByText("Buy‑ins: 3")
    ).toBeVisible();
    await expect(
      page.getByText("Bob").locator("..").getByText("Buy‑ins: 2")
    ).toBeVisible();
    await expect(
      page.getByText("Charlie").locator("..").getByText("Buy‑ins: 1")
    ).toBeVisible();

    // Total pot: (3+2+1) * 10 = 60 EUR
    expect(await getTotalPotText(page)).toBe("60.00 EUR");
  });

  test("total pot updates correctly after rebuys", async ({ page }) => {
    const matchId = "test-match-3";
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Player1", createdAt: new Date().toISOString() },
        { id: "p2", name: "Player2", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          buyInAmount: 500, // 5.00 EUR (custom buy-in)
          players: [
            { userId: "p1", buyIns: 1, finalValue: 0 },
            { userId: "p2", buyIns: 1, finalValue: 0 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    await page.goto(`/live-match?match=${matchId}`);

    // Initial: 2 * 5 = 10 EUR
    expect(await getTotalPotText(page)).toBe("10.00 EUR");

    // Add rebuys
    await addRebuy(page, "Player1", 3); // now 4 buy-ins
    await addRebuy(page, "Player2", 1); // now 2 buy-ins

    // Total buy-ins: 4 + 2 = 6
    // Total pot: 6 * 5 = 30 EUR
    expect(await getTotalPotText(page)).toBe("30.00 EUR");

    // Verify MATCH INFO section shows correct buy-in amount
    await expect(page.getByText("Buy‑in each")).toBeVisible();
    await expect(page.getByText("5.00 EUR")).toBeVisible();
    await expect(page.getByText("Total buy‑ins")).toBeVisible();
    await expect(
      page.getByText("Total buy‑ins").locator("..").locator("span.font-pixel")
    ).toHaveText("6");
  });

  test("proceed to cashout preserves state", async ({ page }) => {
    const matchId = "test-match-4";
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

    await page.goto(`/live-match?match=${matchId}`);

    // Add some rebuys
    await addRebuy(page, "Alice", 2);
    await addRebuy(page, "Bob", 1);

    // Proceed to cashout
    await page.getByRole("button", { name: "PROCEED TO CASHOUT" }).click();

    // Should be on cashout page with same match
    await expect(page.getByRole("heading", { name: "CASHOUT" })).toBeVisible();
    await expect(page.getByText("Alice")).toBeVisible();
    await expect(page.getByText("Bob")).toBeVisible();

    // Verify buy-ins carried over (Alice: 3, Bob: 2)
    // Check that paid-in amounts are correct
    // Alice: 3 * 10 = 30 EUR, Bob: 2 * 10 = 20 EUR
    await expect(
      page.getByText("Alice").locator("..").getByText("Paid in: 30.00 EUR")
    ).toBeVisible();
    await expect(
      page.getByText("Bob").locator("..").getByText("Paid in: 20.00 EUR")
    ).toBeVisible();
  });

  test("match info displays correct timestamps", async ({ page }) => {
    const matchId = "test-match-5";
    const startedAt = new Date("2026-01-01T20:00:00Z").toISOString();

    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "p1", name: "Player", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          buyInAmount: 1000,
          players: [{ userId: "p1", buyIns: 1, finalValue: 0 }],
          startedAt,
          createdAt: startedAt,
        },
      ],
    });

    await page.goto(`/live-match?match=${matchId}`);

    // Should show started time (format depends on locale, but should contain time)
    await expect(page.getByText("Started")).toBeVisible();
    // Just verify something time-like appears (regex for HH:MM or H:MM)
    await expect(page.getByText(/\d{1,2}:\d{2}/)).toBeVisible();
  });

  test("error state when match not found", async ({ page }) => {
    // Navigate with invalid match ID
    await page.goto("/live-match?match=invalid-id");

    await expect(page.getByRole("heading", { name: "ERROR" })).toBeVisible();
    await expect(page.getByText("Match not found")).toBeVisible();

    // Should have button to start new match
    await page.getByRole("button", { name: "Start New Match" }).click();
    await expect(
      page.getByRole("heading", { name: "NEW MATCH SETUP" })
    ).toBeVisible();
  });
});
