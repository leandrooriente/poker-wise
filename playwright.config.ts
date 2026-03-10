import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],
  webServer: process.env.CI
    ? {
        command: "npm run start",
        url: "http://localhost:3001",
        reuseExistingServer: true,
        env: {
          PORT: "3001",
          POSTGRES_URL: process.env.POSTGRES_URL || "postgresql://user:pass@localhost:5432/db",
          ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@example.com",
          ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "changeme",
          AUTH_SECRET: process.env.AUTH_SECRET || "01234567890123456789012345678901",
          NODE_ENV: process.env.NODE_ENV || "test",
        },
      }
    : {
        command: "npm run dev",
        url: "http://localhost:3001",
        reuseExistingServer: true,
        env: {
          PORT: "3001",
          POSTGRES_URL: process.env.POSTGRES_URL || "postgresql://user:pass@localhost:5432/db",
          ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@example.com",
          ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "changeme",
          AUTH_SECRET: process.env.AUTH_SECRET || "01234567890123456789012345678901",
          NODE_ENV: process.env.NODE_ENV || "development",
        },
      },
});
