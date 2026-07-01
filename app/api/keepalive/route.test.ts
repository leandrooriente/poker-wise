import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

import { pingDatabase } from "@/server/db/keepalive";

vi.mock("@/server/db/keepalive", () => ({
  pingDatabase: vi.fn(),
}));

const originalCronSecret = process.env.CRON_SECRET;

function keepaliveRequest(authorization?: string) {
  const headers = new Headers();

  if (authorization !== undefined) {
    headers.set("authorization", authorization);
  }

  return new Request("https://example.com/api/keepalive", {
    headers,
  }) as NextRequest;
}

afterEach(() => {
  vi.clearAllMocks();

  if (originalCronSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalCronSecret;
  }
});

describe("GET /api/keepalive", () => {
  it("pings the database and returns JSON when authorization is not configured", async () => {
    delete process.env.CRON_SECRET;
    vi.mocked(pingDatabase).mockResolvedValue(undefined);

    const response = await GET(keepaliveRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "ok",
      database: "reachable",
    });
    expect(typeof body.checkedAt).toBe("string");
    expect(pingDatabase).toHaveBeenCalledOnce();
  });

  it("rejects missing bearer tokens when CRON_SECRET is configured", async () => {
    process.env.CRON_SECRET = "expected-secret";

    const response = await GET(keepaliveRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      error: "Unauthorized",
    });
    expect(pingDatabase).not.toHaveBeenCalled();
  });

  it("returns a sanitized failure response when the database ping fails", async () => {
    delete process.env.CRON_SECRET;
    vi.mocked(pingDatabase).mockRejectedValue(new Error("connection details"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await GET(keepaliveRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      error: "Database keepalive failed",
    });
    expect(pingDatabase).toHaveBeenCalledOnce();

    consoleError.mockRestore();
  });
});
