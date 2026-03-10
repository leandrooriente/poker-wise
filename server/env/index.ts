import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  POSTGRES_URL: z.string().url(),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

let cachedEnv: z.infer<typeof envSchema> | null = null;
let usingFallback = false;

export function getEnv() {
  if (!cachedEnv) {
    const result = envSchema.safeParse(process.env);
    if (result.success) {
      cachedEnv = result.data;
    } else {
      // For non‑production builds, provide fallback values to allow the build to succeed.
      // This is useful for Vercel preview deployments where env vars may not be set.
      const nodeEnv = process.env.NODE_ENV || "development";
      if (nodeEnv === "production") {
        // In production we insist on valid environment variables.
        throw new Error(
          `Invalid environment configuration: ${result.error.issues
            .map((e: any) => `${e.path.join(".")}: ${e.message}`)
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
        AUTH_SECRET: "dummy-secret-for-build",
        NODE_ENV: nodeEnv as "development" | "test" | "production",
      };
    }
  }
  return cachedEnv;
}

export { envSchema };
export const isEnvValid = () => !usingFallback;