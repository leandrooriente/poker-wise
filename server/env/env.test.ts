import { beforeEach, describe, expect, it } from "vitest";

import { envSchema, getEnv, isEnvValid, resetEnvCacheForTests } from "./index";

const validSecret = "auth-secret-01234567890123456789012345678901";

function setEnv(name: string, value: string): void {
  (process.env as unknown as Record<string, string | undefined>)[name] = value;
}

function deleteEnv(name: string): void {
  delete (process.env as unknown as Record<string, string | undefined>)[name];
}

describe("env validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetEnvCacheForTests();
  });

  it("parses the Cloudflare application environment", () => {
    setEnv("AUTH_SECRET", validSecret);
    setEnv("APP_ENV", "production");
    setEnv("NODE_ENV", "production");

    const result = envSchema.safeParse(process.env);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        AUTH_SECRET: validSecret,
        APP_ENV: "production",
        NODE_ENV: "production",
      });
    }
  });

  it("requires a sufficiently long auth secret", () => {
    deleteEnv("AUTH_SECRET");

    const missing = envSchema.safeParse(process.env);
    expect(missing.success).toBe(false);

    setEnv("AUTH_SECRET", "too-short");
    const short = envSchema.safeParse(process.env);
    expect(short.success).toBe(false);
  });

  it("defaults application and Node environments to development", () => {
    setEnv("AUTH_SECRET", validSecret);
    deleteEnv("APP_ENV");
    deleteEnv("NODE_ENV");

    const result = envSchema.safeParse(process.env);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.APP_ENV).toBe("development");
      expect(result.data.NODE_ENV).toBe("development");
    }
  });

  it("uses fallback values during the Next.js production build phase", () => {
    setEnv("NODE_ENV", "production");
    setEnv("NEXT_PHASE", "phase-production-build");
    deleteEnv("AUTH_SECRET");

    expect(getEnv()).toMatchObject({
      AUTH_SECRET: validSecret,
      APP_ENV: "development",
      NODE_ENV: "production",
    });
    expect(isEnvValid()).toBe(false);
  });

  it("throws for missing runtime secrets in production", () => {
    setEnv("NODE_ENV", "production");
    deleteEnv("NEXT_PHASE");
    deleteEnv("AUTH_SECRET");

    expect(() => getEnv()).toThrow(/Invalid environment configuration/);
  });
});
