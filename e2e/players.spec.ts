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
});
