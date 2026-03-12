import { beforeEach, describe, expect, it } from "vitest";

import { envSchema, getEnv, isEnvValid, resetEnvCacheForTests } from "./index";

describe("env validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetEnvCacheForTests();
  });

  it("should parse valid environment variables", () => {
    process.env.POSTGRES_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD = "secret";
    process.env.AUTH_SECRET = "supersecret";
    (process.env as Record<string, string | undefined>).NODE_ENV =
      "development";

    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.POSTGRES_URL).toBe(
        "postgresql://user:pass@localhost:5432/db"
      );
      expect(result.data.ADMIN_EMAIL).toBe("admin@example.com");
      expect(result.data.ADMIN_PASSWORD).toBe("secret");
      expect(result.data.AUTH_SECRET).toBe("supersecret");
      expect(result.data.NODE_ENV).toBe("development");
    }
  });

  it("should fail when required variables are missing", () => {
    delete process.env.POSTGRES_URL;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.AUTH_SECRET;

    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorPaths = result.error.issues.map((e) => e.path.join("."));
      expect(errorPaths).toContain("POSTGRES_URL");
      expect(errorPaths).toContain("ADMIN_EMAIL");
      expect(errorPaths).toContain("ADMIN_PASSWORD");
      expect(errorPaths).toContain("AUTH_SECRET");
    }
  });

  it("should default NODE_ENV to development when not set", () => {
    process.env.POSTGRES_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD = "secret";
    process.env.AUTH_SECRET = "supersecret";
    delete (process.env as Record<string, string | undefined>).NODE_ENV;

    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe("development");
    }
  });

  it("uses fallback values during the Next.js production build phase", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    (process.env as Record<string, string | undefined>).NEXT_PHASE =
      "phase-production-build";
    delete process.env.POSTGRES_URL;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.AUTH_SECRET;

    expect(getEnv()).toMatchObject({
      POSTGRES_URL: "postgresql://user:pass@localhost:5432/db",
      ADMIN_EMAIL: "admin@example.com",
      ADMIN_PASSWORD: "changeme",
      AUTH_SECRET: "auth-secret-01234567890123456789012345678901",
      NODE_ENV: "production",
    });
    expect(isEnvValid()).toBe(false);
  });

  it("throws for missing environment variables outside the build phase", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete (process.env as Record<string, string | undefined>).NEXT_PHASE;
    delete process.env.POSTGRES_URL;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.AUTH_SECRET;

    expect(() => getEnv()).toThrow(/Invalid environment configuration/);
    expect(isEnvValid()).toBe(true);
  });
});
