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

export const env = envSchema.parse(process.env);
export { envSchema };