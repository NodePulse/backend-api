import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  AUTH_DATABASE_URL: z.string().min(1, "AUTH_DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  PORT: z.string().default("8001").transform(Number),
  API_GATEWAY_URL: z.string().default("http://localhost:8000"),
  RABBITMQ_URL: z.string().default("amqp://localhost:5672"),
  RABBITMQ_AUTH_QUEUE: z.string().default("auth-service-queue"),
  RABBITMQ_RESPONSE_QUEUE: z.string().default("api-gateway-response-queue"),
  RABBITMQ_USER_CREATED_QUEUE: z.string().default("user-created-events"),
});

export const env = envSchema.parse(process.env);

