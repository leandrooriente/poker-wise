import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { middleware } from "./middleware";

const originalMaintenanceMode = process.env.MAINTENANCE_MODE;

afterEach(() => {
  const env = process.env as unknown as Record<string, string | undefined>;
  if (originalMaintenanceMode === undefined) {
    delete env.MAINTENANCE_MODE;
  } else {
    env.MAINTENANCE_MODE = originalMaintenanceMode;
  }
});

function proxyRequest(path: string, init?: { method?: string }) {
  return new NextRequest(`https://example.com${path}`, init);
}

describe("middleware", () => {
  it("blocks database writes while maintenance mode is enabled", async () => {
    (process.env as unknown as Record<string, string | undefined>)[
      "MAINTENANCE_MODE"
    ] = "true";

    const response = await middleware(
      proxyRequest("/api/admin/groups", { method: "POST" })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Poker Wise is temporarily read-only for maintenance.",
    });
  });

  it("allows public share pages without a session cookie", async () => {
    const response = await middleware(proxyRequest("/share/public-token"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.has("location")).toBe(false);
  });

  it("redirects unauthenticated app routes to the login page", async () => {
    const response = await middleware(proxyRequest("/admin"));
    const location = response.headers.get("location");

    expect(response.status).toBe(307);
    expect(location).not.toBeNull();

    const redirectUrl = new URL(location!);
    expect(redirectUrl.origin).toBe("https://example.com");
    expect(redirectUrl.pathname).toBe("/login");
    expect(redirectUrl.searchParams.get("from")).toBe("/admin");
  });

  it("keeps admin share mutations protected", async () => {
    const response = await middleware(
      proxyRequest("/api/admin/groups/test/share", { method: "POST" })
    );
    const location = response.headers.get("location");

    expect(response.status).toBe(307);
    expect(location).not.toBeNull();

    const redirectUrl = new URL(location!);
    expect(redirectUrl.pathname).toBe("/login");
    expect(redirectUrl.searchParams.get("from")).toBe(
      "/api/admin/groups/test/share"
    );
  });
});
