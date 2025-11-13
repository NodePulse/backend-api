import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("8000").transform(Number),
  CLIENT_URL: z.string().default("http://localhost:3000"),
  NODE_ENV: z.string().default("development"),
  JWT_SECRET: z.string().default("development-secret-key-change-in-production-minimum-32-characters"),
  ENABLE_ENCRYPTION: z.string().default("false").transform((val) => val === "true"),
  ENCRYPTION_KEY: z.string().optional(),
  ENCRYPTION_SALT: z.string().optional(),
  RABBITMQ_URL: z.string().default("amqp://localhost:5672"),
  RABBITMQ_AUTH_QUEUE: z.string().default("auth-service-queue"),
  RABBITMQ_USER_QUEUE: z.string().default("user-service-queue"),
  RABBITMQ_EVENT_QUEUE: z.string().default("event-service-queue"),
  RABBITMQ_RESPONSE_QUEUE: z.string().default("api-gateway-response-queue"),
  R2_BUCKET: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);

