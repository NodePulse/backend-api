import dotenv from "dotenv";
import { z } from "zod";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env from service-specific directory first, then parent directory
// Path structure: shared/config/env.ts -> microservices/<service>/.env
// or fallback to: shared/config/env.ts -> backend/.env
const serviceEnvPath = join(__dirname, "../../.env"); // Service-specific .env (e.g., auth-service/.env)
const parentEnvPath = join(__dirname, "../../../.env"); // Parent .env (backend/.env)

// Load service-specific .env if it exists, otherwise load parent .env
if (existsSync(serviceEnvPath)) {
  dotenv.config({ path: serviceEnvPath });
} else {
  dotenv.config({ path: parentEnvPath });
}

const envSchema = z.object({
  PORT: z.string().default("8085").transform(Number),
  CLIENT_URL: z.string().default("http://localhost:3000"),
  NODE_ENV: z.string().default("development"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  EMAIL_USER: z.string().min(1, "EMAIL_USER is required"),
  EMAIL_PASS: z.string().min(1, "EMAIL_PASS is required"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(), // Optional encryption key for response encryption
});

export const env = envSchema.parse(process.env);

