import { defineConfig, devices } from "@playwright/test";

import { getE2ELocalEnv } from "./lib/e2e-local-config";

// Determine base URL: use environment variable if set, otherwise default to local dev server
const port = process.env.PORT || "3001";
const baseURL = process.env.BASE_URL || `http://localhost:${port}`;

// Web server configuration: only start local server when testing against localhost
// (i.e., when BASE_URL is not provided or is the default localhost)
const useLocalServer =
  !process.env.BASE_URL || baseURL.startsWith("http://localhost");

const localEnv = getE2ELocalEnv(process.env);

const webServerConfig = useLocalServer
  ? {
      command: "npx tsx scripts/e2e-local-server.ts",
      url: `http://localhost:${port}`,
      reuseExistingServer: true,
      env: localEnv,
    }
  : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["line"], ["html"]],
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
