import { z } from "zod";

// Cloudflare populates process.env from Worker vars/secrets when nodejs_compat is
// enabled. Next.js loads local .env files before application modules execute.

const envSchema = z.object({
  AUTH_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(32)
  ),
  APP_ENV: z.enum(["development", "production"]).default("development"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;
let usingFallback = false;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(process.env);
  if (result.success) {
    usingFallback = false;
    cachedEnv = result.data;
    return cachedEnv;
  }

  const nodeEnv = process.env.NODE_ENV || "development";
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

  if (nodeEnv === "production" && !isBuildPhase) {
    throw new Error(
      `Invalid environment configuration: ${result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ")}`
    );
  }

  console.warn(
    "Environment variables missing or invalid, using fallback values for build or development."
  );
  usingFallback = true;
  cachedEnv = {
    AUTH_SECRET: "auth-secret-01234567890123456789012345678901",
    APP_ENV: "development",
    NODE_ENV: nodeEnv as AppEnv["NODE_ENV"],
  };
  return cachedEnv;
}

export { envSchema };
export const isEnvValid = () => !usingFallback;

export function resetEnvCacheForTests(): void {
  cachedEnv = null;
  usingFallback = false;
}
