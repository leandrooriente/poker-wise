/* eslint-disable */
import { test, expect } from "@playwright/test";
import {
  seedNamespacedLocalStorage,
  loginAdminAndCreateNamespacedGroup,
  generateNamespace,
} from "./helpers";

test.describe("Header responsive layout", () => {
  let namespace: string;

  test.beforeEach(async ({ page }) => {
    // Generate a unique namespace for this test run
    namespace = generateNamespace();
    // Seed default group data with namespace
    await seedNamespacedLocalStorage(page, namespace, {});
    // Log in as admin and create a namespaced server group (required for admin UI)
    await loginAdminAndCreateNamespacedGroup(page);
    await page.goto("/");
    // Capture console logs from the page
    page.on("console", (msg) => console.log(`[page] ${msg.text()}`));
  });

  test("header layout on desktop (1280x800)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Ensure header is visible
    await expect(page.locator("header")).toBeVisible();
    // Ensure logo/title is visible
    await expect(page.getByText("POKERWISE")).toBeVisible();
    // Ensure group selector is visible
    await expect(page.getByLabel("Select group")).toBeVisible();
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();

    // Take screenshot of the header
    const header = page.locator("header");
    const screenshot = await header.screenshot();
    await test.info().attach("header-desktop.png", {
      body: screenshot,
      contentType: "image/png",
    });

    // Verify the selector is not overflowing
    const headerWidth = await header.boundingBox().then((box) => box?.width);
    const selector = page.locator("#group-select");
    const selectorWidth = await selector
      .boundingBox()
      .then((box) => box?.width);
    expect(selectorWidth).toBeLessThan(headerWidth || 1280);
  });

  test("header layout on mobile (375x667)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Ensure header is visible
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByText("POKERWISE")).toBeVisible();
    await expect(page.getByLabel("Select group")).toBeVisible();
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();

    // Take screenshot of the header
    const header = page.locator("header");
    const screenshot = await header.screenshot();
    await test.info().attach("header-mobile.png", {
      body: screenshot,
      contentType: "image/png",
    });

    // On mobile, the selector should be below the logo/title
    // We can check that the selector's y position is greater than the title's bottom
    const title = page.getByText("POKERWISE");
    const selector = page.locator("#group-select");
    const titleBox = await title.boundingBox();
    const selectorBox = await selector.boundingBox();
    if (titleBox && selectorBox) {
      expect(selectorBox.y).toBeGreaterThan(titleBox.y + titleBox.height / 2);
    }
  });
});
