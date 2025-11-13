import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.string().default("8002").transform(Number),
  API_GATEWAY_URL: z.string().default("http://localhost:8000"),
  USER_DATABASE_URL: z.string().min(1, "USER_DATABASE_URL is required"),
  RABBITMQ_URL: z.string().default("amqp://localhost:5672"),
  RABBITMQ_USER_QUEUE: z.string().default("user-service-queue"),
  RABBITMQ_RESPONSE_QUEUE: z.string().default("api-gateway-response-queue"),
  RABBITMQ_USER_CREATED_QUEUE: z.string().default("user-created-events"),
  R2_BUCKET: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);

