import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors, { type CorsOptions } from "cors";
import compression from "compression";
import { createLogger, format, transports } from "winston";
import crypto from "crypto";
import { ResponseBuilder } from "./responseHandler";
import { env } from "../config/env";

// Shared logger instance
export const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

export interface AppSetupOptions {
  serviceName: string;
  port: number;
  apiPrefix?: string;
  routes?: (app: Express) => void;
  customMiddleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
  customErrorHandler?: (err: any, req: Request, res: Response, next: NextFunction) => void;
}

/**
 * Creates and configures an Express app with common middleware
 * @param options - Configuration options for the app
 * @returns Configured Express app
 */
export function createApp(options: AppSetupOptions): Express {
  const app = express();
  const { serviceName, port, routes, customMiddleware, customErrorHandler } = options;

  // CORS configuration
  const corsOrigins = [env.CLIENT_URL, "http://localhost:3000"];
  const corsOptions: CorsOptions = {
    origin: corsOrigins,
    credentials: true,
  };

  // Common middleware
  app.use(compression() as any);
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors(corsOptions));
  
  // Request timing middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.startTime = process.hrtime();
    next();
  });

  // Custom middleware
  if (customMiddleware) {
    customMiddleware.forEach((middleware) => app.use(middleware));
  }

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    // Type assertion to resolve Express type version mismatch between node_modules
    ResponseBuilder.ok(res as any, { status: "ok", service: serviceName });
  });

  // Routes
  if (routes) {
    routes(app);
  }

  // 404 handler - must be before error handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Type assertion to resolve Express type version mismatch between node_modules
    ResponseBuilder.notFound(res as any, {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Error handler middleware - must be defined AFTER all routes
  if (customErrorHandler) {
    app.use(customErrorHandler);
  } else {
    app.use(createDefaultErrorHandler());
  }

  // Start server
  app.listen(port, () => {
    logger.info(`${serviceName} running`, {
      environment: env.NODE_ENV,
      port,
      url: `http://localhost:${port}`,
    });
  });

  return app;
}

/**
 * Creates a default error handler middleware
 */
export function createDefaultErrorHandler() {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    // Ensure res is a valid Express Response object
    if (!res || typeof res.setHeader !== "function") {
      logger.error("Invalid response object in error handler", {
        error: err?.message,
        resType: typeof res,
        hasSetHeader: typeof res?.setHeader,
      });
      return;
    }

    // Check if response has already been sent
    if (res.headersSent) {
      logger.warn("Response already sent, cannot send error response", {
        error: err?.message,
        method: req.method,
        url: req.originalUrl,
      });
      return;
    }

    const requestId = crypto.randomUUID();
    logger.error("Unexpected error", {
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      requestId,
    });
    
    // Type assertion to resolve Express type version mismatch between node_modules
    return ResponseBuilder.serverError(res as any, err, {
      message: "Internal server error",
      headers: { "X-Error-Type": "Unexpected" },
    });
  };
}

/**
 * Creates a validation error handler for AJV validation errors
 */
export function createValidationErrorHandler() {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.status === 400 && err.errors) {
      const requestId = crypto.randomUUID();
      const errors = err.errors.map((e: any) => ({
        field: e.path?.split("/").pop() || e.instancePath?.replace(/^\//, "") || "unknown",
        issue: e.message,
        path: e.path || e.instancePath || "unknown",
      }));
      
      return new ResponseBuilder(res as any)
        .status(400)
        .message("Invalid input provided")
        .withValidationErrors(errors)
        .withErrorCode("INVALID_INPUT")
        .withRequestId(requestId)
        .withRequestContext({ method: req.method, url: req.originalUrl })
        .withLogging(true)
        .send();
    }
    
    // Fall through to default error handler
    next(err);
  };
}

