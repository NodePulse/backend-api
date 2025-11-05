// src/config/env.ts
import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config();

// Define the schema for environment variables
const envSchema = z.object({
  PORT: z.string().default("8085").transform(Number),
  CLIENT_URL: z.string().default("http://localhost:3000"),
  NODE_ENV: z.string().default("development"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  EMAIL_USER: z.string().min(1, "EMAIL_USER is required"),
  EMAIL_PASS: z.string().min(1, "EMAIL_PASS is required"),
});

// Parse and export the validated environment variables
export const env = envSchema.parse(process.env);
