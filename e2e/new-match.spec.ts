/* eslint-disable */
import { test, expect } from "@playwright/test";
import {
  seedNamespacedLocalStorage,
  loginAdminAndCreateNamespacedGroup,
  generateNamespace,
} from "./helpers";

test.describe("New Match Setup", () => {
  let namespace: string;

  test.beforeEach(async ({ page }) => {
    // Generate a unique namespace for this test run
    namespace = generateNamespace();

    // Clear localStorage and seed with namespaced group
    await page.goto("/history");
    await page.evaluate(() => window.localStorage.clear());
    await seedNamespacedLocalStorage(page, namespace, {});

    // Log in as admin and create a namespaced server group (required for admin UI)
    await loginAdminAndCreateNamespacedGroup(page);
    // Note: The localStorage group and server group are separate but both isolated.
  });

  test("empty state when there are no players", async ({ page }) => {
    await page.goto("/new-match");

    await expect(
      page.getByRole("heading", { name: "NEW MATCH" })
    ).toBeVisible();
    await expect(page.getByText("No players found.")).toBeVisible();
    await expect(
      page.getByText("Go to Players tab to add players first.")
    ).toBeVisible();

    // START MATCH button should be disabled
    const startButton = page.getByRole("button", { name: "START MATCH" });
    await expect(startButton).toBeDisabled();
  });

  test("select and unselect players updates checkbox state", async ({
    page,
  }) => {
    // Seed players via localStorage for faster setup
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "2", name: "Bob", createdAt: new Date().toISOString() },
        { id: "3", name: "Charlie", createdAt: new Date().toISOString() },
      ],
    });

    await page.goto("/new-match");

    const aliceIndicator = page
      .locator("label", { hasText: "Alice" })
      .locator("[data-testid^='player-checkbox-indicator-']");
    const bobIndicator = page
      .locator("label", { hasText: "Bob" })
      .locator("[data-testid^='player-checkbox-indicator-']");

    await expect(aliceIndicator).toHaveAttribute("data-state", "unchecked");
    await expect(bobIndicator).toHaveAttribute("data-state", "unchecked");

    // Initially 0 selected

    // Select Alice and Bob
    await page.locator("label", { hasText: "Alice" }).click();
    await page.locator("label", { hasText: "Bob" }).click();

    await expect(aliceIndicator).toHaveAttribute("data-state", "checked");
    await expect(bobIndicator).toHaveAttribute("data-state", "checked");

    // Unselect Alice
    await page.locator("label", { hasText: "Alice" }).click();

    // Verify only Bob is selected (checkbox checked)
    await expect(page.getByLabel("Alice")).not.toBeChecked();
    await expect(page.getByLabel("Bob")).toBeChecked();
    await expect(aliceIndicator).toHaveAttribute("data-state", "unchecked");
    await expect(bobIndicator).toHaveAttribute("data-state", "checked");
  });

  test("match title input is not shown", async ({ page }) => {
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "2", name: "Bob", createdAt: new Date().toISOString() },
      ],
    });

    await page.goto("/new-match");
    await page.locator("label", { hasText: "Alice" }).click();
    await page.locator("label", { hasText: "Bob" }).click();

    await expect(page.getByTestId("match-title-input")).toHaveCount(0);
  });

  test("custom buy-in override updates summary", async ({ page }) => {
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "2", name: "Bob", createdAt: new Date().toISOString() },
      ],
    });

    await page.goto("/new-match");
    await page.locator("label", { hasText: "Alice" }).click();
    await page.locator("label", { hasText: "Bob" }).click();

    await expect(page.getByText("BUY‑IN AMOUNT (EUR)").first()).toBeVisible();
    await expect(page.getByText("Total pot")).toBeVisible();
    await expect(page.getByText("20.00 EUR")).toBeVisible();

    // Change to 12.50 EUR
    await expect(page.getByTestId("buy-in-amount-input")).toBeVisible({
      timeout: 5000,
    });
    await page.getByTestId("buy-in-amount-input").fill("12.50");

    // Total pot should update
    await expect(page.getByTestId("buy-in-amount-input")).toHaveValue("12.50");
    await expect(page.getByText("25.00 EUR")).toBeVisible(); // 2 * 12.50
  });

  test("cannot start match with zero players", async ({ page }) => {
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "2", name: "Bob", createdAt: new Date().toISOString() },
      ],
    });

    await page.goto("/new-match");

    // Button should be disabled when no players selected
    const startButton = page.getByRole("button", { name: "START MATCH" });
    await expect(startButton).toBeDisabled();

    // Select Alice (only one player), button should still be disabled (need at least 2)
    await page.locator("label", { hasText: "Alice" }).click();
    await expect(startButton).toBeDisabled();

    // Select Bob (now two players), button should be enabled
    await page.locator("label", { hasText: "Bob" }).click();
    await expect(startButton).toBeEnabled();

    // Unselect Alice (back to one player), button should be disabled again
    await page.locator("label", { hasText: "Alice" }).click();
    await expect(startButton).toBeDisabled();
  });

  test("complete match setup flow", async ({ page }) => {
    await seedNamespacedLocalStorage(page, namespace, {
      players: [
        { id: "1", name: "Alice", createdAt: new Date().toISOString() },
        { id: "2", name: "Bob", createdAt: new Date().toISOString() },
      ],
    });

    await page.goto("/new-match");

    // Select both players
    await page.locator("label", { hasText: "Alice" }).click();
    await page.locator("label", { hasText: "Bob" }).click();

    // Set custom buy-in
    await page.getByTestId("buy-in-amount-input").fill("15.00");

    // Verify summary
    await expect(page.getByTestId("buy-in-amount-input")).toHaveValue("15.00");
    await expect(page.getByText("30.00 EUR")).toBeVisible();

    // Start match
    await page.getByRole("button", { name: "START MATCH" }).click();

    // Should navigate to live match
    await expect(
      page.getByRole("heading", { name: "LIVE MATCH" })
    ).toBeVisible();
    await expect(page.getByText("Alice", { exact: true })).toBeVisible();
    await expect(page.getByText("Bob", { exact: true })).toBeVisible();
    await expect(
      page.locator("span.font-pixel.text-retro-yellow.text-2xl")
    ).toHaveCount(2); // Each player has buy‑ins count display
  });
});
