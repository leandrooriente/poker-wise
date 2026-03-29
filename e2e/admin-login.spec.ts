import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Admin Login", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: /POKERWISE/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "ADMIN LOGIN" })
    ).toBeVisible();
    await expect(page.getByLabel("EMAIL")).toBeVisible();
    await expect(page.getByLabel("PASSWORD")).toBeVisible();
    await expect(page.getByRole("button", { name: "LOGIN" })).toBeVisible();

    await expect(page.getByRole("link", { name: "Groups" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "New Match" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "History" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Score" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Login" })).toHaveCount(0);
    await expect(page.locator("#group-select")).toHaveCount(0);
  });

  test("invalid credentials show error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("EMAIL").fill("wrong@example.com");
    await page.getByLabel("PASSWORD").fill("wrong");
    await page.getByRole("button", { name: "LOGIN" }).click();

    // Should show error message
    await expect(page.getByText("Invalid email or password")).toBeVisible();
    // Should stay on login page
    await expect(page).toHaveURL(/\/login$/);
  });

  test("valid credentials log in and redirect", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("EMAIL").fill("admin@example.com");
    await page.getByLabel("PASSWORD").fill("changeme");
    await page.getByRole("button", { name: "LOGIN" }).click();

    // Should redirect to home page (groups)
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Login" })).toHaveCount(0);
  });

  test("logout redirects to login", async ({ page }) => {
    // First log in
    await page.goto("/login");
    await page.getByLabel("EMAIL").fill("admin@example.com");
    await page.getByLabel("PASSWORD").fill("changeme");
    await page.getByRole("button", { name: "LOGIN" }).click();
    await expect(page).toHaveURL("/");

    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "LOGIN" })).toBeVisible();
  });
});
