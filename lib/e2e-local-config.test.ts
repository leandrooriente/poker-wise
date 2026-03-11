import { describe, expect, it } from "vitest";

import { getE2ELocalEnv } from "./e2e-local-config";

describe("getE2ELocalEnv", () => {
  it("fills in local defaults when env vars are missing", () => {
    expect(getE2ELocalEnv({} as NodeJS.ProcessEnv)).toEqual({
      PORT: "3001",
      POSTGRES_URL: "postgresql://postgres:postgres@localhost:5432/poker_wise",
      ADMIN_EMAIL: "admin@example.com",
      ADMIN_PASSWORD: "changeme",
      AUTH_SECRET: "auth-secret-01234567890123456789012345678901",
      NODE_ENV: "development",
    });
  });

  it("preserves provided environment overrides", () => {
    expect(
      getE2ELocalEnv({
        PORT: "4010",
        POSTGRES_URL: "postgresql://custom",
        ADMIN_EMAIL: "owner@example.com",
        ADMIN_PASSWORD: "secret",
        AUTH_SECRET: "another-secret",
        NODE_ENV: "test",
      } as NodeJS.ProcessEnv)
    ).toEqual({
      PORT: "4010",
      POSTGRES_URL: "postgresql://custom",
      ADMIN_EMAIL: "owner@example.com",
      ADMIN_PASSWORD: "secret",
      AUTH_SECRET: "another-secret",
      NODE_ENV: "test",
    });
  });
});
