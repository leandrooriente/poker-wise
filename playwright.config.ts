import { defineConfig, devices } from "@playwright/test";

// Determine base URL: use environment variable if set, otherwise default to local dev server
const baseURL = process.env.BASE_URL || "http://localhost:3001";

// Web server configuration: only start local server when testing against localhost
// (i.e., when BASE_URL is not provided or is the default localhost)
const useLocalServer =
  !process.env.BASE_URL || baseURL.startsWith("http://localhost");

const webServerConfig = useLocalServer
  ? process.env.CI
    ? {
        command: "npm run start",
        url: "http://localhost:3001",
        reuseExistingServer: true,
        env: {
          PORT: "3001",
          POSTGRES_URL:
            process.env.POSTGRES_URL ||
            "postgresql://user:pass@localhost:5432/db",
          ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@example.com",
          ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "changeme",
          AUTH_SECRET:
            process.env.AUTH_SECRET ||
            "auth-secret-01234567890123456789012345678901",
          NODE_ENV: process.env.NODE_ENV || "test",
        },
      }
    : {
        command: "npm run dev",
        url: "http://localhost:3001",
        reuseExistingServer: true,
        env: {
          PORT: "3001",
          POSTGRES_URL:
            process.env.POSTGRES_URL ||
            "postgresql://user:pass@localhost:5432/db",
          ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@example.com",
          ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "changeme",
          AUTH_SECRET:
            process.env.AUTH_SECRET ||
            "auth-secret-01234567890123456789012345678901",
          NODE_ENV: process.env.NODE_ENV || "development",
        },
      }
  : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "html",
  use: {
    baseURL,
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
  webServer: webServerConfig,
});
