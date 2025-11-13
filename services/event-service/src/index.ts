import express, { type Request, type Response } from "express";
import cors from "cors";
import { createLogger, format, transports } from "winston";
import { env } from "./config/env.js";
import { rabbitMQConsumer } from "./services/rabbitmq.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration - only allow API Gateway
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from API Gateway only
      if (!origin || origin === env.API_GATEWAY_URL) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Health check endpoint (only accessible from API Gateway)
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "event-service",
    timestamp: new Date().toISOString(),
  });
});

// Reject all other routes with CORS error
app.use((req: Request, res: Response) => {
  res.status(403).json({
    success: false,
    message: "Access denied. This service can only be accessed through the API Gateway.",
    error: "CORS policy violation",
  });
});

const PORT = env.PORT || 8003;

// Start RabbitMQ consumer
rabbitMQConsumer
  .connect()
  .then(() => {
    logger.info("Event Service RabbitMQ consumer connected");
  })
  .catch((error) => {
    logger.error("Failed to start RabbitMQ consumer", { error });
    process.exit(1);
  });

// Start HTTP server
app.listen(PORT, () => {
  logger.info(`Event Service HTTP server listening on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await rabbitMQConsumer.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await rabbitMQConsumer.close();
  process.exit(0);
});

