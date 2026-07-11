import { describe, expect, it } from "vitest";

import {
  parsePostgresWriteFreezeArgs,
  quotePostgresIdentifier,
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

  it("quotes server-provided identifiers", () => {
    expect(quotePostgresIdentifier('role"name')).toBe('"role""name"');
  });
});
