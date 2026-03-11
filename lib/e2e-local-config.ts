export function getE2ELocalEnv(env: NodeJS.ProcessEnv) {
  return {
    PORT: env.PORT || "3001",
    POSTGRES_URL:
      env.POSTGRES_URL ||
      "postgresql://postgres:postgres@localhost:5432/poker_wise",
    ADMIN_EMAIL: env.ADMIN_EMAIL || "admin@example.com",
    ADMIN_PASSWORD: env.ADMIN_PASSWORD || "changeme",
    AUTH_SECRET:
      env.AUTH_SECRET || "auth-secret-01234567890123456789012345678901",
    NODE_ENV: env.NODE_ENV || "development",
  };
}
