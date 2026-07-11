import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { proxy } from "./proxy";

vi.mock("@/server/auth/session-options", () => ({
  getSessionOptions: () => ({
    cookieName: "poker-wise-admin-session",
  }),
}));

function proxyRequest(path: string, init?: { method?: string }) {
  return new NextRequest(`https://example.com${path}`, init);
}

describe("proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks admin writes during maintenance before authentication", async () => {
    vi.stubEnv("MAINTENANCE_MODE", "true");

    const response = await proxy(
      proxyRequest("/api/admin/groups", { method: "POST" })
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("600");
    await expect(response.json()).resolves.toEqual({
      error: "Poker Wise is temporarily read-only for maintenance.",
    });
  });

  it("keeps admin reads available during maintenance", async () => {
    vi.stubEnv("MAINTENANCE_MODE", "true");

    const response = await proxy(proxyRequest("/api/admin/groups"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("allows the keepalive API route without a session cookie", async () => {
    const response = await proxy(proxyRequest("/api/keepalive"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.has("location")).toBe(false);
  });

  it("allows public share pages without a session cookie", async () => {
    const response = await proxy(proxyRequest("/share/public-token"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.has("location")).toBe(false);
  });

  it("redirects unauthenticated app routes to the login page", async () => {
    const response = await proxy(proxyRequest("/admin"));
    const location = response.headers.get("location");

    expect(response.status).toBe(307);
    expect(location).not.toBeNull();

    const redirectUrl = new URL(location!);
    expect(redirectUrl.origin).toBe("https://example.com");
    expect(redirectUrl.pathname).toBe("/login");
    expect(redirectUrl.searchParams.get("from")).toBe("/admin");
  });

  it("keeps admin share mutations protected", async () => {
    const response = await proxy(
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
