import type { Express } from "express";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { createLogger, format, transports } from "winston";
import eventRouter from "./routes/eventRoutes.js";
import { createApp } from "../../shared/utils/appSetup.js";
import { env } from "../../shared/config/env.js";
import { swaggerSpec } from "./config/swagger.js";
import { encryptResponseMiddleware } from "./middleware/encryptResponse.js";

const PORT = env.PORT || 3003;

// Structured logger
const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

// Create and configure the Express app
createApp({
  serviceName: "Event Service",
  port: PORT,
  routes: (app: Express) => {
    // API Documentation
    app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "Event Service API Documentation",
      })
    );

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        service: "event-service",
        timestamp: new Date().toISOString(),
      });
    });

    // Apply response encryption middleware
    app.use(encryptResponseMiddleware);

    // API routes
    app.use("/api/v1/events", eventRouter);

    logger.info(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
    logger.info(`❤️  Health check available at http://localhost:${PORT}/health`);
  },
});

