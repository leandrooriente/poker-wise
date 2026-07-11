export function getE2ELocalEnv(env: NodeJS.ProcessEnv) {
  return {
    PORT: env.PORT || "3001",
    ADMIN_EMAIL: env.ADMIN_EMAIL || "admin@example.com",
    ADMIN_PASSWORD: env.ADMIN_PASSWORD || "changeme",
    AUTH_SECRET:
      env.AUTH_SECRET || "auth-secret-01234567890123456789012345678901",
    APP_ENV: "development" as const,
    NODE_ENV: env.NODE_ENV || "development",
  };
}
