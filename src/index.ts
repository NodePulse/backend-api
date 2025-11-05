// src/index.ts
import express from "express";
import type { Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors, { CorsOptions } from "cors";
import compression from "compression";
import { Server } from "socket.io";
import { createServer } from "http";
import { createLogger, format, transports } from "winston";
import crypto from "crypto";
import { initializeSocket } from "./utils/socketHandler.js";
import router from "./routes/index.js";
import { ResponseBuilder } from "./utils/responseHandler.js";
import { env } from "./config/env.js";
import { swaggerSpec } from "./config/swagger.js";
import swaggerUi from "swagger-ui-express";

// Initialize logger
const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

// Initialize Express application
const app = express();
const PORT = env.PORT;
const CLIENT_URL = env.CLIENT_URL;

// Centralized CORS configuration
const corsOrigins = [CLIENT_URL, "http://localhost:3001"];
const corsOptions: CorsOptions = {
  origin: corsOrigins,
  credentials: true,
};

// Middleware
app.use(compression()); // Enable gzip compression
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use((req, res, next) => {
  // use req to not throw error
  console.log(req)
  res.locals.startTime = process.hrtime(); // For ResponseBuilder timing
  next();
});

// Error-handling middleware
app.use((err: any, req: Request, res: Response) => {
  const requestId = crypto.randomUUID();
  if (err.status === 400 && err.errors) {
    const errors = err.errors.map((e: any) => ({
      field:
        e.path?.split("/").pop() ||
        e.instancePath?.replace(/^\//, "") ||
        "unknown",
      issue: e.message,
      path: e.path || e.instancePath || "unknown",
    }));
    return new ResponseBuilder(res)
      .status(400)
      .message("Invalid input provided")
      .withValidationErrors(errors)
      .withErrorCode("INVALID_INPUT")
      .withRequestId(requestId)
      .withRequestContext({ method: req.method, url: req.originalUrl })
      .withLogging(true)
      .send();
  }

  // Handle generic errors
  logger.error("Unexpected error", {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    requestId,
  });
  return ResponseBuilder.serverError(res, err, {
    message: "Internal server error",
    headers: { "X-Error-Type": "Unexpected" },
  });
});

// Root route
app.get("/", (_req: Request, res: Response) => {
  ResponseBuilder.ok(
    res,
    { Hello: "World" },
    { message: "Welcome to the API" }
  );
});

// API routes
app.use("/api/v1", router);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Initialize HTTP and Socket.IO servers
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
  },
});

initializeSocket(io);

// Start the server
httpServer.listen(PORT, () => {
  logger.info(`Server running`, {
    environment: env.NODE_ENV,
    port: PORT,
    url: `http://localhost:${PORT}`,
  });
});
