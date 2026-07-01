import { hash as hashPassword } from "bcryptjs";
import { describe, expect, it } from "vitest";

import {
  findMatchingShareTokenRecord,
  generateRawShareToken,
  hashShareToken,
} from "./share-tokens";

function record(id: string, tokenHash: string, revokedAt: Date | null = null) {
  return { id, tokenHash, revokedAt };
}

describe("share token helpers", () => {
  it("generates URL-safe raw tokens and stores only a deterministic hash", () => {
    const rawToken = generateRawShareToken();
    const tokenHash = hashShareToken(rawToken);

    expect(rawToken).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(rawToken.length).toBeGreaterThanOrEqual(40);
    expect(tokenHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(tokenHash).not.toContain(rawToken);
    expect(hashShareToken(rawToken)).toBe(tokenHash);
  });

  it("finds active token records by raw token", async () => {
    const tokenHash = hashShareToken("valid-token");

    await expect(
      findMatchingShareTokenRecord("valid-token", [
        record("revoked", tokenHash, new Date()),
        record("active", tokenHash),
      ])
    ).resolves.toMatchObject({ id: "active" });
  });

  it("does not match invalid or revoked tokens", async () => {
    await expect(
      findMatchingShareTokenRecord("missing", [
        record("active", hashShareToken("different-token")),
      ])
    ).resolves.toBeUndefined();

    await expect(
      findMatchingShareTokenRecord("revoked-token", [
        record("revoked", hashShareToken("revoked-token"), new Date()),
      ])
    ).resolves.toBeUndefined();
  });

  it("can still validate legacy bcrypt token hashes", async () => {
    const legacyHash = await hashPassword("legacy-token", 10);

    await expect(
      findMatchingShareTokenRecord("legacy-token", [
        record("legacy", legacyHash),
      ])
    ).resolves.toMatchObject({ id: "legacy" });
  });
});
