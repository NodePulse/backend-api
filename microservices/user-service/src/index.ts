// src/index.ts
import type { Request, Response, NextFunction } from "express";
import express from "express";
import swaggerUi from "swagger-ui-express";
import cookieParser from "cookie-parser";
import cors, { CorsOptions } from "cors";
import compression from "compression";
import userRouter from "./routes/userRoutes";
import { createValidationErrorHandler, createDefaultErrorHandler, logger } from "../shared/utils/appSetup";
import { ResponseBuilder } from "../shared/utils/responseHandler";
import { env } from "../shared/config/env";
import { swaggerSpec } from "./config/swagger";
import { encryptResponseMiddleware } from "./middleware/encryptResponse";

const PORT = env.PORT || 3002;

// Custom error handler
const customErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.status === 400 && err.errors) {
    const validationHandler = createValidationErrorHandler();
    return validationHandler(err, req, res, next);
  }
  const defaultHandler = createDefaultErrorHandler();
  return defaultHandler(err, req, res, next);
};

// Create Express app
const app = express();

// CORS configuration
const corsOrigins = [env.CLIENT_URL, "http://localhost:3000"];
const corsOptions: CorsOptions = {
  origin: corsOrigins,
  credentials: true,
};

// Common middleware
app.use(compression());
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

// Request timing middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.startTime = process.hrtime();
  next();
});

// Swagger UI documentation endpoint
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "User Service API Documentation",
  customfavIcon: "/favicon.ico",
}));

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  ResponseBuilder.ok(res as any, { status: "ok", service: "User Service" });
});

// Response encryption middleware - must be before routes
app.use(encryptResponseMiddleware);

// API routes
app.use("/api/v1/users", userRouter);

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  ResponseBuilder.notFound(res as any, {
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error handler middleware
app.use(customErrorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`User Service running`, {
    environment: env.NODE_ENV,
    port: PORT,
    url: `http://localhost:${PORT}`,
    docs: `http://localhost:${PORT}/api-docs`,
  });
});

