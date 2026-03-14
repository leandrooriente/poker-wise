import fs from "node:fs/promises";
import path from "node:path";

import { request, type FullConfig } from "@playwright/test";

const storageStatePath = path.join("playwright", ".cache", "admin.json");

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (typeof baseURL !== "string") {
    throw new Error("Playwright baseURL is required for E2E global setup");
  }

  await fs.mkdir(path.dirname(storageStatePath), { recursive: true });

  const requestContext = await request.newContext({ baseURL });

  const response = await requestContext.post("/api/auth/login", {
    data: {
      email: "admin@example.com",
      password: "changeme",
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create Playwright auth state: ${response.status()}`
    );
  }

  await requestContext.storageState({ path: storageStatePath });
  await requestContext.dispose();
}
