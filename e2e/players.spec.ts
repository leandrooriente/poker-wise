import { test, expect } from "@playwright/test";
import {
  addPlayer,
  gotoActiveGroupPlayersPage,
  loginAdminAndCreateNamespacedGroup,
} from "./helpers";

test.describe("Player Management", () => {
  test.beforeEach(async ({ page }) => {
    // Log in as admin and create a namespaced group for test isolation
    await loginAdminAndCreateNamespacedGroup(page);
    await gotoActiveGroupPlayersPage(page);
  });

  test("add player", async ({ page }) => {
    await addPlayer(page, {
      name: "Alice",
    });

    // Verify player card shows name
    const playerCard = page
      .getByTestId("player-card")
      .filter({ hasText: "Alice" });
    await expect(
      playerCard.getByRole("heading", { name: "Alice" })
    ).toBeVisible();
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
    await expect(
      playerCard.getByRole("heading", { name: "Robert" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bob" })).not.toBeVisible();
  });

  test("delete player", async ({ page }) => {
    await addPlayer(page, { name: "Charlie" });
    await addPlayer(page, { name: "David" });

    const playerCards = page.getByTestId("player-card");
    await expect(playerCards).toHaveCount(2);

    // Set up dialog acceptance for confirmation
    page.on("dialog", (dialog) => dialog.accept());

    const charlieCard = playerCards.filter({ hasText: "Charlie" });
    await charlieCard.getByRole("button", { name: "Delete" }).click();

    // Verify deletion
    await expect(
      page.getByRole("heading", { name: "Charlie" })
    ).not.toBeVisible();
    await expect(playerCards).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "David" })).toBeVisible();
  });

  test("player data persists after reload", async ({ page }) => {
    await addPlayer(page, {
      name: "Eve",
    });

    // Reload page
    await page.reload();

    // Verify player still exists
    await expect(page.getByRole("heading", { name: "Eve" })).toBeVisible();
  });

  test("empty state when no players", async ({ page }) => {
    // Already cleared in beforeEach
    await expect(page.getByText("No players yet.")).toBeVisible();
  });

  test("cannot add player with empty name", async ({ page }) => {
    // Try to submit empty form
    await page.getByRole("button", { name: "ADD PLAYER" }).click();

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
      .filter({ has: page.getByTestId("player-name-input") });
    await expect(form).toBeVisible();

    // Verify form layout: stacked vertically on mobile
    // Check that flex-direction is column (should be for viewport < sm)
    // await expect(form).toHaveCSS("flex-direction", "column");

    // Input should be full width
    const input = form.getByTestId("player-name-input");
    const button = form.getByRole("button", { name: "ADD PLAYER" });

    // Verify the input still spans the form width on mobile
    const formWidth = await form.evaluate((el) => el.clientWidth);
    const inputWidth = await input.evaluate((el) => el.clientWidth);
    const buttonWidth = await button.evaluate((el) => el.clientWidth);
    expect(Math.abs(inputWidth - formWidth)).toBeLessThanOrEqual(4);
    expect(buttonWidth).toBeLessThanOrEqual(formWidth);

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
    await expect(
      page.getByRole("heading", { name: "Mobile Player" })
    ).toBeVisible();
  });
});
