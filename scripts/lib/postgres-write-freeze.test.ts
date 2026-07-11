import { describe, expect, it } from "vitest";

import {
  parsePostgresWriteFreezeArgs,
  quotePostgresIdentifier,
  resolvePostgresWriteFreezeConnectionStrings,
} from "./postgres-write-freeze";

describe("PostgreSQL write-freeze arguments", () => {
  it("requires the exact freeze confirmation", () => {
    expect(() => parsePostgresWriteFreezeArgs(["freeze"])).toThrow(
      "--confirm=FREEZE_PRODUCTION_WRITES"
    );

    expect(
      parsePostgresWriteFreezeArgs([
        "freeze",
        "--confirm=FREEZE_PRODUCTION_WRITES",
        "--ssl-no-verify",
      ])
    ).toEqual({
      mode: "freeze",
      envFile: ".env.production.local",
      sslNoVerify: true,
    });
  });

  it("requires a different explicit confirmation to unfreeze", () => {
    expect(() =>
      parsePostgresWriteFreezeArgs([
        "unfreeze",
        "--confirm=FREEZE_PRODUCTION_WRITES",
      ])
    ).toThrow("--confirm=UNFREEZE_PRODUCTION_WRITES");

    expect(
      parsePostgresWriteFreezeArgs([
        "unfreeze",
        "--confirm=UNFREEZE_PRODUCTION_WRITES",
        "--env-file=/secure/production.env",
      ])
    ).toEqual({
      mode: "unfreeze",
      envFile: "/secure/production.env",
      sslNoVerify: false,
    });
  });

  it("verifies both Supabase session and transaction pool endpoints", () => {
    expect(
      resolvePostgresWriteFreezeConnectionStrings({
        POSTGRES_URL_NON_POOLING: "postgres://session",
        POSTGRES_URL: "postgres://transaction",
      })
    ).toEqual({
      session: "postgres://session",
      transaction: "postgres://transaction",
    });

    expect(
      resolvePostgresWriteFreezeConnectionStrings({
        POSTGRES_URL: "postgres://fallback",
      })
    ).toEqual({
      session: "postgres://fallback",
      transaction: "postgres://fallback",
    });

    expect(() => resolvePostgresWriteFreezeConnectionStrings({})).toThrow(
      "POSTGRES_URL_NON_POOLING or POSTGRES_URL"
    );
  });

  it("quotes server-provided identifiers", () => {
    expect(quotePostgresIdentifier('role"name')).toBe('"role""name"');
  });
});
