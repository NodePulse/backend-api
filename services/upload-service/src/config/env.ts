import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.string().default("8004").transform(Number),
  API_GATEWAY_URL: z.string().default("http://localhost:8000"),
  RABBITMQ_URL: z.string().default("amqp://localhost:5672"),
  RABBITMQ_UPLOAD_QUEUE: z.string().default("upload-service-queue"),
  RABBITMQ_RESPONSE_QUEUE: z.string().default("api-gateway-response-queue"),
  R2_BUCKET: z.string().min(1, "R2_BUCKET is required"),
  R2_ENDPOINT: z.string().min(1, "R2_ENDPOINT is required"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
  R2_PUBLIC_URL: z.string().min(1, "R2_PUBLIC_URL is required"),
});

export const env = envSchema.parse(process.env);

