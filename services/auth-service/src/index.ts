import express, { type Express } from "express";
import cors from "cors";
import { createLogger, format, transports } from "winston";
import { env } from "./config/env.js";
import { rabbitMQConsumer } from "./services/rabbitmq.js";
import { eventPublisher } from "./services/eventPublisher.js";
import prisma from "./config/prisma.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const app: Express = express();
const PORT = env.PORT || 8001;

// CORS configuration - ONLY allow API Gateway
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests from API Gateway only
    const allowedOrigins = [env.API_GATEWAY_URL];
    
    // If no origin (like Postman, curl, etc.), reject
    if (!origin) {
      callback(new Error("Not allowed by CORS - No origin header"));
      return;
    }
    
    // Check if origin matches API Gateway
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS - Origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (only accessible from API Gateway)
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "auth-service",
    timestamp: new Date().toISOString(),
  });
});

// Reject all other routes with CORS error
app.use((req, res) => {
  res.status(403).json({
    success: false,
    message: "Access denied. This service can only be accessed through the API Gateway.",
    error: "CORS policy violation",
  });
});

// Start RabbitMQ consumer and Express server
async function startService() {
  try {
    // Connect to RabbitMQ consumer
    await rabbitMQConsumer.connect();
    
    // Connect to event publisher
    await eventPublisher.connect();
    
    // Test database connection
    await prisma.$connect();
    logger.info("Database connected successfully");

    // Start Express server
    app.listen(PORT, () => {
      logger.info("Auth Service started successfully", {
        environment: env.NODE_ENV,
        port: PORT,
        apiGatewayUrl: env.API_GATEWAY_URL,
      });
    });
  } catch (error) {
    logger.error("Failed to start service", { error });
    process.exit(1);
  }
}

startService();

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await rabbitMQConsumer.close();
  await eventPublisher.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await rabbitMQConsumer.close();
  await eventPublisher.close();
  await prisma.$disconnect();
  process.exit(0);
});


