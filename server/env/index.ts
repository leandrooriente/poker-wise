import dotenv from "dotenv";
import { z } from "zod";

// dotenv is not needed in Edge Runtime (environment variables are already loaded)
if ((globalThis as any).EdgeRuntime === undefined) {
  dotenv.config();
}

const envSchema = z.object({
  POSTGRES_URL: z
    .string()
    .url()
    .default("postgresql://user:pass@localhost:5432/db"),
  ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  ADMIN_PASSWORD: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().min(1).default("changeme")
  ),
  AUTH_SECRET: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().min(1).default("auth-secret-01234567890123456789012345678901")
  ),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

let cachedEnv: z.infer<typeof envSchema> | null = null;
let usingFallback = false;

export function getEnv() {
  if (!cachedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      // This should not happen because defaults are provided, but if validation fails due to invalid types, we throw
      throw new Error(
        `Invalid environment configuration: ${result.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ")}`
      );
    }
    cachedEnv = result.data;
    // Determine if any required field is using default value
    // For simplicity, we assume usingFallback = false if all fields are present and valid.
    // Since defaults are provided, we cannot know if they were missing.
    // We'll set usingFallback = false for now, but we can compute by checking if POSTGRES_URL is default.
    usingFallback =
      cachedEnv.POSTGRES_URL === "postgresql://user:pass@localhost:5432/db";
  }
  return cachedEnv;
}

export { envSchema };
export const isEnvValid = () => !usingFallback;
export const isDatabaseEnvValid = () => {
  const env = getEnv();
  return env.POSTGRES_URL !== "postgresql://user:pass@localhost:5432/db";
};

export function resetEnvCacheForTests() {
  cachedEnv = null;
  usingFallback = false;
}
