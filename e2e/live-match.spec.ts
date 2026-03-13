import { test, expect } from "@playwright/test";

import { seedViaApi } from "./api-helpers";
import {
  addRebuy,
  getTotalPotText,
  loginAdminAndCreateNamespacedGroup,
} from "./helpers";

test.describe("Live Match", () => {
  let groupSlug: string;

  test.beforeEach(async ({ page }) => {
    await page.goto("/history");
    await page.evaluate(() => window.localStorage.clear());
    const group = await loginAdminAndCreateNamespacedGroup(page);
    groupSlug = group.groupSlug;
  });

  test("multiple rebuys for one player", async ({ page }) => {
    const matchId = "test-match-1";
    const { matchIdMap } = await seedViaApi(page, groupSlug, {
      players: [
        { id: "p1", name: "Alice", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          title: "Test Match",
          buyInAmount: 1000,
          players: [{ userId: "p1", buyIns: 1, finalValue: 0 }],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });
    await page.goto(`/live-match?match=${matchIdMap[matchId]}`);
    await expect(
      page.getByRole("heading", { name: "LIVE MATCH" })
    ).toBeVisible();

    await expect(page.getByRole("heading", { name: "Alice" })).toBeVisible();
    await expect(
      page
        .getByTestId("player-row")
        .locator("span.font-pixel.text-retro-yellow.text-2xl")
    ).toHaveText("1");
    expect(await getTotalPotText(page)).toBe("10.00 EUR");

    await addRebuy(page, "Alice", 2);

    await expect(
      page
        .getByTestId("player-row")
        .locator("span.font-pixel.text-retro-yellow.text-2xl")
    ).toHaveText("3");
    await expect(page.getByText("Total paid: 30.00 EUR")).toBeVisible();
    expect(await getTotalPotText(page)).toBe("30.00 EUR");
  });

  test("rebuys across multiple players", async ({ page }) => {
    const matchId = "test-match-2";
    const { matchIdMap } = await seedViaApi(page, groupSlug, {
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
    await page.goto(`/live-match?match=${matchIdMap[matchId]}`);
    await expect(
      page.getByRole("heading", { name: "LIVE MATCH" })
    ).toBeVisible();

    expect(await getTotalPotText(page)).toBe("30.00 EUR");

    await addRebuy(page, "Alice", 2);
    await addRebuy(page, "Bob", 1);

    const aliceRow = page.getByTestId("player-row").filter({ hasText: "Alice" });
    const bobRow = page.getByTestId("player-row").filter({ hasText: "Bob" });
    const charlieRow = page
      .getByTestId("player-row")
      .filter({ hasText: "Charlie" });

    await expect(
      aliceRow.locator("span.font-pixel.text-retro-yellow.text-2xl")
    ).toHaveText("3");
    await expect(
      bobRow.locator("span.font-pixel.text-retro-yellow.text-2xl")
    ).toHaveText("2");
    await expect(
      charlieRow.locator("span.font-pixel.text-retro-yellow.text-2xl")
    ).toHaveText("1");

    expect(await getTotalPotText(page)).toBe("60.00 EUR");
  });

  test("total pot updates correctly after rebuys", async ({ page }) => {
    const matchId = "test-match-3";
    const { matchIdMap } = await seedViaApi(page, groupSlug, {
      players: [
        { id: "p1", name: "Player1", createdAt: new Date().toISOString() },
        { id: "p2", name: "Player2", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: matchId,
          buyInAmount: 500,
          players: [
            { userId: "p1", buyIns: 1, finalValue: 0 },
            { userId: "p2", buyIns: 1, finalValue: 0 },
          ],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });
    await page.goto(`/live-match?match=${matchIdMap[matchId]}`);

    expect(await getTotalPotText(page)).toBe("10.00 EUR");

    await addRebuy(page, "Player1", 3);
    await addRebuy(page, "Player2", 1);

    expect(await getTotalPotText(page)).toBe("30.00 EUR");
    await expect(page.getByText("Buy‑in each")).toBeVisible();
    await expect(page.getByText("5.00 EUR")).toBeVisible();
    await expect(page.getByText("Total buy‑ins")).toBeVisible();
    await expect(
      page.getByText("Total buy‑ins").locator("..").locator("span.font-pixel")
    ).toHaveText("6");
  });

  test("proceed to cashout preserves state", async ({ page }) => {
    const matchId = "test-match-4";
    const { matchIdMap } = await seedViaApi(page, groupSlug, {
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
    await page.goto(`/live-match?match=${matchIdMap[matchId]}`);

    await addRebuy(page, "Alice", 2);
    await addRebuy(page, "Bob", 1);
    await page.getByRole("button", { name: "PROCEED TO CASHOUT" }).click();

    await expect(page.getByRole("heading", { name: "CASHOUT" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Alice" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bob" })).toBeVisible();
    await expect(
      page.getByText("Alice").locator("..").getByText("Buy‑ins: 3")
    ).toBeVisible();
    await expect(
      page.getByText("Bob").locator("..").getByText("Buy‑ins: 2")
    ).toBeVisible();
  });

  test("match info shows buy-in totals without started timestamp", async ({
    page,
  }) => {
    const matchId = "test-match-5";
    const startedAt = new Date("2026-01-01T20:00:00Z").toISOString();

    const { matchIdMap } = await seedViaApi(page, groupSlug, {
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
    await page.goto(`/live-match?match=${matchIdMap[matchId]}`);

    const matchInfo = page
      .getByRole("heading", { name: "MATCH INFO" })
      .locator("..");

    await expect(matchInfo.getByText("Buy‑in each")).toBeVisible();
    await expect(matchInfo.getByText("10.00 EUR").first()).toBeVisible();
    await expect(matchInfo.getByText("Total buy‑ins")).toBeVisible();
    await expect(matchInfo.getByText("1").first()).toBeVisible();
    await expect(matchInfo.getByText("Total pot")).toBeVisible();
    await expect(page.getByText("Started")).toHaveCount(0);
  });

  test("error state when match not found", async ({ page }) => {
    await page.goto("/live-match?match=invalid-id");

    await expect(page.getByRole("heading", { name: "ERROR" })).toBeVisible();
    await expect(page.getByText("Match not found")).toBeVisible();

    await page.getByRole("button", { name: "Start New Match" }).click();
    await expect(
      page.getByRole("heading", { name: "NEW MATCH" })
    ).toBeVisible();
  });
});
