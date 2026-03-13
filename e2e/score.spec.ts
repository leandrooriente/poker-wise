import { expect, test } from "@playwright/test";

import {
  generateNamespace,
  loginAdminAndCreateNamespacedGroup,
  seedNamespacedLocalStorage,
} from "./helpers";

test.describe("Score Page", () => {
  let namespace: string;

  test.beforeEach(async ({ page }) => {
    namespace = generateNamespace();
    await page.goto("/history");
    await page.evaluate(() => window.localStorage.clear());
    await seedNamespacedLocalStorage(page, namespace, {});
    await loginAdminAndCreateNamespacedGroup(page);
  });

  test("shows empty state when there are no settled matches", async ({ page }) => {
    await page.goto("/score");

    await expect(
      page.getByRole("heading", { name: "SCOREBOARD" })
    ).toBeVisible();
    await expect(page.getByText("No settled matches yet.")).toBeVisible();
  });

  test("ranks players by total and average net using settled matches only", async ({
    page,
  }) => {
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "paulo", name: "Paulo", createdAt: new Date().toISOString() },
        { id: "pedro", name: "Pedro", createdAt: new Date().toISOString() },
        { id: "john", name: "John", createdAt: new Date().toISOString() },
      ],
      matches: [
        {
          id: "s1",
          title: "Settled 1",
          buyInAmount: 1000,
          status: "settled",
          players: [
            { userId: "paulo", buyIns: 1, finalValue: 2500 },
            { userId: "john", buyIns: 1, finalValue: 500 },
          ],
          startedAt: "2026-03-01T20:00:00.000Z",
          createdAt: "2026-03-01T20:00:00.000Z",
        },
        {
          id: "s2",
          title: "Settled 2",
          buyInAmount: 1000,
          status: "settled",
          players: [
            { userId: "pedro", buyIns: 1, finalValue: 2500 },
            { userId: "john", buyIns: 1, finalValue: 500 },
          ],
          startedAt: "2026-03-02T20:00:00.000Z",
          createdAt: "2026-03-02T20:00:00.000Z",
        },
        {
          id: "s3",
          title: "Settled 3",
          buyInAmount: 1000,
          status: "settled",
          players: [
            { userId: "pedro", buyIns: 1, finalValue: 1500 },
            { userId: "paulo", buyIns: 1, finalValue: 500 },
          ],
          startedAt: "2026-03-03T20:00:00.000Z",
          createdAt: "2026-03-03T20:00:00.000Z",
        },
        {
          id: "live-1",
          title: "Live 1",
          buyInAmount: 1000,
          status: "live",
          players: [
            { userId: "pedro", buyIns: 1, finalValue: 9000 },
            { userId: "john", buyIns: 1, finalValue: 0 },
          ],
          startedAt: "2026-03-04T20:00:00.000Z",
          createdAt: "2026-03-04T20:00:00.000Z",
        },
      ],
    });

    await page.goto("/score");

    await expect(
      page.getByRole("button", { name: "TOTAL" })
    ).toHaveClass(/bg-white/);

    const rows = page.getByTestId("score-row");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Pedro");
    await expect(rows.nth(0)).toContainText("20.00 EUR");
    await expect(rows.nth(0)).toContainText("2 matches");
    await expect(rows.nth(1)).toContainText("Paulo");
    await expect(rows.nth(1)).toContainText("10.00 EUR");
    await expect(rows.nth(1)).toContainText("2 matches");
    await expect(rows.nth(2)).toContainText("John");
    await expect(rows.nth(2)).toContainText("-10.00 EUR");
    await expect(rows.nth(2)).toContainText("2 matches");

    await page.getByRole("button", { name: "AVERAGE" }).click();

    await expect(
      page.getByRole("button", { name: "AVERAGE" })
    ).toHaveClass(/bg-white/);
    await expect(rows.nth(0)).toContainText("Pedro");
    await expect(rows.nth(0)).toContainText("10.00 EUR");
    await expect(rows.nth(1)).toContainText("Paulo");
    await expect(rows.nth(1)).toContainText("5.00 EUR");
    await expect(rows.nth(2)).toContainText("John");
    await expect(rows.nth(2)).toContainText("-5.00 EUR");
  });
});
