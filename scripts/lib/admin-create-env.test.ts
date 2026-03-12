import { describe, expect, it } from "vitest";

import { getAdminCreateEnv } from "./admin-create-env";

describe("getAdminCreateEnv", () => {
  it("returns the POSTGRES_URL without requiring unrelated env vars", () => {
    expect(
      getAdminCreateEnv({
        POSTGRES_URL: "postgresql://user:pass@db.example.com:5432/pokerwise",
      })
    ).toEqual({
      POSTGRES_URL: "postgresql://user:pass@db.example.com:5432/pokerwise",
    });
  });

  it("throws when POSTGRES_URL is missing", () => {
    expect(() => getAdminCreateEnv({})).toThrow(/POSTGRES_URL/);
  });
});
