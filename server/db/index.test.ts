import { describe, expect, it } from "vitest";

import { resolvePgSslConfig } from "./index";

describe("resolvePgSslConfig", () => {
  it("disables SSL in non-production environments", () => {
    expect(resolvePgSslConfig("development", undefined)).toBe(false);
    expect(resolvePgSslConfig("test", "preview")).toBe(false);
  });

  it("uses strict SSL in production by default", () => {
    expect(resolvePgSslConfig("production", "production")).toEqual({
      rejectUnauthorized: true,
    });
  });

  it("allows self-signed certificates in Vercel preview", () => {
    expect(resolvePgSslConfig("production", "preview")).toEqual({
      rejectUnauthorized: false,
    });
  });
});
