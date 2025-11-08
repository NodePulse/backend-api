import type { Express } from "express";
import transactionRouter from "./routes/transactionRoutes.js";
import { createApp } from "../../shared/utils/appSetup.js";
import { env } from "../../shared/config/env.js";

const PORT = env.PORT || 3004;

// Create and configure the Express app
createApp({
  serviceName: "Transaction Service",
  port: PORT,
  routes: (app: Express) => {
    app.use("/api/v1/transactions", transactionRouter);
  },
});

