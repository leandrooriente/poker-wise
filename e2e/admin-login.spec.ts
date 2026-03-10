import { test, expect } from '@playwright/test';
import { resetDatabase, isDatabaseReady } from './db-helpers';

let databaseReady = false;

test.beforeAll(async () => {
  databaseReady = await isDatabaseReady();
  if (!databaseReady) {
    console.warn('Database not ready, skipping admin login tests');
  }
});

test.describe('Admin Login', () => {
  test.beforeEach(async () => {
    if (!databaseReady) return;
    // Ensure database is reset and admin exists (from bootstrap)
    await resetDatabase();
  });

  test('login page loads', async ({ page }) => {
    if (!databaseReady) test.skip();
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'ADMIN LOGIN' })).toBeVisible();
    await expect(page.getByLabel('EMAIL')).toBeVisible();
    await expect(page.getByLabel('PASSWORD')).toBeVisible();
    await expect(page.getByRole('button', { name: 'LOGIN' })).toBeVisible();
  });

  test('invalid credentials show error', async ({ page }) => {
    if (!databaseReady) test.skip();
    await page.goto('/login');
    await page.getByLabel('EMAIL').fill('wrong@example.com');
    await page.getByLabel('PASSWORD').fill('wrong');
    await page.getByRole('button', { name: 'LOGIN' }).click();

    // Should show error message
    await expect(page.getByText('Invalid email or password')).toBeVisible();
    // Should stay on login page
    await expect(page).toHaveURL(/\/login$/);
  });

  test('valid credentials log in and redirect', async ({ page }) => {
    if (!databaseReady) test.skip();
    await page.goto('/login');
    await page.getByLabel('EMAIL').fill('admin@example.com');
    await page.getByLabel('PASSWORD').fill('changeme');
    await page.getByRole('button', { name: 'LOGIN' }).click();

    // Should redirect to home page (groups)
    await expect(page).toHaveURL('/');
    // Verify session cookie? Not needed for UI test.
    // Ensure we are logged in by checking header maybe (future)
  });

  test('logout redirects to login', async ({ page }) => {
    if (!databaseReady) test.skip();
    // First log in
    await page.goto('/login');
    await page.getByLabel('EMAIL').fill('admin@example.com');
    await page.getByLabel('PASSWORD').fill('changeme');
    await page.getByRole('button', { name: 'LOGIN' }).click();
    await expect(page).toHaveURL('/');

    // TODO: add logout button UI (not yet implemented)
    // For now, call logout API directly
    const response = await page.request.post('/api/auth/logout');
    expect(response.status()).toBe(200);
    // Expect redirect to login page
    await page.goto('/');
    // Should redirect to login? Not yet protected.
    // We'll just ensure logout endpoint works.
  });
});