import express, { type Express } from "express";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import { createLogger, format, transports } from "winston";
import { env } from "./config/env.js";
import { rabbitMQService } from "./services/rabbitmq.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import eventRouter from "./routes/eventRoutes.js";
import uploadRouter from "./routes/uploadRoutes.js";
import internalHealthRouter from "./routes/internalHealthRoutes.js";
import swaggerDocsRouter from "./routes/swaggerDocsRoutes.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const app: Express = express();
const PORT = env.PORT || 8000;

// CORS configuration
const corsOptions = {
  origin: [env.CLIENT_URL, "http://localhost:3000", "http://localhost:3001"],
  credentials: true,
};

// Middleware
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(cors(corsOptions));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
  });
});
app.use("/internal/health", internalHealthRouter)

// Swagger docs
app.use("/api-docs", swaggerDocsRouter);

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/events", eventRouter);
app.use("/api/v1/upload", uploadRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error("Unhandled error", { error: err });
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV !== "production" ? { message: err.message } : undefined,
  });
});

// Start server
async function startServer() {
  try {
    // Connect to RabbitMQ
    await rabbitMQService.connect();
    logger.info("RabbitMQ connected");

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`API Gateway running`, {
        environment: env.NODE_ENV,
        port: PORT,
        url: `http://localhost:${PORT}`,
      });
    });
  } catch (error) {
    logger.error("Failed to start server", { error });
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await rabbitMQService.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await rabbitMQService.close();
  process.exit(0);
});


