import { describe, it, expect, beforeEach } from 'vitest';
import { envSchema } from './index';

describe('env validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  it('should parse valid environment variables', () => {
    process.env.POSTGRES_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'secret';
    process.env.AUTH_SECRET = 'supersecret';
    (process.env as any).NODE_ENV = 'development';

    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.POSTGRES_URL).toBe('postgresql://user:pass@localhost:5432/db');
      expect(result.data.ADMIN_EMAIL).toBe('admin@example.com');
      expect(result.data.ADMIN_PASSWORD).toBe('secret');
      expect(result.data.AUTH_SECRET).toBe('supersecret');
      expect(result.data.NODE_ENV).toBe('development');
    }
  });

  it('should fail when required variables are missing', () => {
    // Clear all env vars
    delete process.env.POSTGRES_URL;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.AUTH_SECRET;

    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorPaths = result.error.issues.map((e: any) => e.path.join('.'));
      expect(errorPaths).toContain('POSTGRES_URL');
      expect(errorPaths).toContain('ADMIN_EMAIL');
      expect(errorPaths).toContain('ADMIN_PASSWORD');
      expect(errorPaths).toContain('AUTH_SECRET');
    }
  });

  it('should default NODE_ENV to development when not set', () => {
    process.env.POSTGRES_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'secret';
    process.env.AUTH_SECRET = 'supersecret';
    // Ensure NODE_ENV is not set
    delete (process.env as any).NODE_ENV;

    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development');
    }
  });
});