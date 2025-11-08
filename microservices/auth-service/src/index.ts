import type { Request, Response, NextFunction } from "express";
import express from "express";
import swaggerUi from "swagger-ui-express";
import cookieParser from "cookie-parser";
import cors, { CorsOptions } from "cors";
import compression from "compression";
import authRouter from "./routes/authRoutes.js";
import { createValidationErrorHandler, createDefaultErrorHandler, logger } from "../shared/utils/appSetup.js";
import { ResponseBuilder } from "../shared/utils/responseHandler.js";
import { env } from "../shared/config/env.js";
import { swaggerSpec } from "./config/swagger.js";
import { encryptResponseMiddleware } from "./middleware/encryptResponse.js";

const PORT = env.PORT || 3001;

// Custom error handler that handles validation errors first, then falls back to default
const customErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Try validation error handler first
  if (err.status === 400 && err.errors) {
    const validationHandler = createValidationErrorHandler();
    return validationHandler(err, req, res, next);
  }
  // Fall back to default error handler
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
  customSiteTitle: "Auth Service API Documentation",
  customfavIcon: "/favicon.ico",
}));

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  ResponseBuilder.ok(res as any, { status: "ok", service: "Auth Service" });
});

// Response encryption middleware - must be before routes
app.use(encryptResponseMiddleware);

// API routes
app.use("/api/v1/auth/users", authRouter);

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
  logger.info(`Auth Service running`, {
    environment: env.NODE_ENV,
    port: PORT,
    url: `http://localhost:${PORT}`,
    docs: `http://localhost:${PORT}/api-docs`,
  });
});

