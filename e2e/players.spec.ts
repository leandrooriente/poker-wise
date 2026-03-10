import { test } from "@playwright/test";

import { addPlayer, expect, seedLocalStorage } from "./helpers";

test.describe("Player Management", () => {
  test.beforeEach(async ({ page }) => {
    // Seed default group and migration marker
    await seedLocalStorage(page, {});
    await page.goto("/");
  });

  test("add player", async ({ page }) => {
    await addPlayer(page, {
      name: "Alice",
    });

    // Verify player card shows name
    const playerCard = page.locator("div", { has: page.getByText("Alice") });
    await expect(playerCard.getByText("Alice")).toBeVisible();
  });

  test.skip("edit player name", async ({ page }) => {
    await addPlayer(page, { name: "Bob" });

    // Click Edit button
    const playerCard = page.getByTestId("player-card").first();
    await playerCard.getByRole("button", { name: "Edit" }).click();

    // Update name
    await expect(playerCard.getByPlaceholder("Player name")).toBeVisible();
    await playerCard.getByPlaceholder("Player name").fill("Robert");
    await playerCard.getByRole("button", { name: "Save" }).click();

    // Verify updates
    await expect(playerCard.getByText("Robert")).toBeVisible();
    await expect(page.getByText("Bob")).not.toBeVisible();
  });

  test("delete player", async ({ page }) => {
    await addPlayer(page, { name: "Charlie" });
    await addPlayer(page, { name: "David" });

    // Verify two players in the active group
    const playerItems = page.getByTestId("player-item");
    await expect(playerItems).toHaveCount(2);

    // Set up dialog acceptance for confirmation
    page.on("dialog", (dialog) => dialog.accept());

    // Delete Charlie (remove from group)
    const charlieItem = playerItems.filter({ hasText: "Charlie" });
    await charlieItem.getByRole("button", { name: "REMOVE" }).click();

    // Verify deletion
    await expect(page.getByText("Charlie")).not.toBeVisible();
    await expect(playerItems).toHaveCount(1);
    await expect(page.getByText("David")).toBeVisible();
  });

  test("player data persists after reload", async ({ page }) => {
    await addPlayer(page, {
      name: "Eve",
    });

    // Reload page
    await page.reload();

    // Verify player still exists
    await expect(page.getByText("Eve")).toBeVisible();
  });

  test("empty state when no players", async ({ page }) => {
    // Already cleared in beforeEach
    await expect(page.getByText("No players yet.")).toBeVisible();
  });

  test("cannot add player with empty name", async ({ page }) => {
    // Try to submit empty form
    await page.getByRole("button", { name: "ADD" }).click();

    // Should still have no players
    await expect(page.getByText("No players yet.")).toBeVisible();
  });

  test("add player on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    // Wait for layout to adjust
    await page.waitForTimeout(100);

    // Find the add-player form
    const form = page
      .locator("form")
      .filter({ has: page.getByPlaceholder("Player name") });
    await expect(form).toBeVisible();

    // Verify form layout: stacked vertically on mobile
    // Check that flex-direction is column (should be for viewport < sm)
    // await expect(form).toHaveCSS("flex-direction", "column");

    // Input should be full width
    const input = form.getByPlaceholder("Player name");
    // Button should be full width on mobile
    const button = form.getByRole("button", { name: "ADD" });

    // Verify both elements take full width of the form
    const formWidth = await form.evaluate((el) => el.clientWidth);
    const inputWidth = await input.evaluate((el) => el.clientWidth);
    const buttonWidth = await button.evaluate((el) => el.clientWidth);
    // Allow small difference due to borders (max 4px)
    expect(Math.abs(inputWidth - formWidth)).toBeLessThanOrEqual(4);
    expect(Math.abs(buttonWidth - formWidth)).toBeLessThanOrEqual(4);

    // Verify button is below input (stacked layout)
    const inputBox = await input.boundingBox();
    const buttonBox = await button.boundingBox();
    expect(inputBox).toBeTruthy();
    expect(buttonBox).toBeTruthy();
    // Button top should be greater than input bottom (with a small tolerance)
    expect(buttonBox!.y).toBeGreaterThan(inputBox!.y + inputBox!.height - 1);

    // Add player works
    await input.fill("Mobile Player");
    await button.click();

    // Verify player added
    await expect(page.getByText("Mobile Player")).toBeVisible();
  });
});
