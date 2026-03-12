import { z } from "zod";
import dotenv from "dotenv";

// dotenv is not needed in Edge Runtime (environment variables are already loaded)
if ((globalThis as any).EdgeRuntime === undefined) {
  dotenv.config();
}

const envSchema = z.object({
  POSTGRES_URL: z.string().url(),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

let cachedEnv: z.infer<typeof envSchema> | null = null;
let usingFallback = false;

export function getEnv() {
  if (!cachedEnv) {
    const result = envSchema.safeParse(process.env);
    if (result.success) {
      usingFallback = false;
      cachedEnv = result.data;
    } else {
      const nodeEnv = process.env.NODE_ENV || "development";
      const vercelEnv = process.env.VERCEL_ENV;
      const nextPhase = process.env.NEXT_PHASE;
      const isBuildPhase = nextPhase === "phase-production-build";
      const requiresStrictEnv =
        nodeEnv === "production" && vercelEnv !== "preview" && !isBuildPhase;

      if (requiresStrictEnv) {
        throw new Error(
          `Invalid environment configuration: ${result.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", ")}`
        );
      }

      console.warn(
        "Environment variables missing or invalid, using fallback values for build."
      );
      usingFallback = true;
      cachedEnv = {
        POSTGRES_URL: "postgresql://user:pass@localhost:5432/db",
        ADMIN_EMAIL: "admin@example.com",
        ADMIN_PASSWORD: "changeme",
        AUTH_SECRET: "auth-secret-01234567890123456789012345678901",
        NODE_ENV: nodeEnv as "development" | "test" | "production",
      };
    }
  }
  return cachedEnv;
}

export { envSchema };
export const isEnvValid = () => !usingFallback;

export function resetEnvCacheForTests() {
  cachedEnv = null;
  usingFallback = false;
}
