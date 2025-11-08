import type { Express } from "express";
import userRouter from "./routes/userRoutes.js";
import { createApp } from "../../shared/utils/appSetup.js";
import { env } from "../../shared/config/env.js";

const PORT = env.PORT || 3002;

// Create and configure the Express app
createApp({
  serviceName: "User Service",
  port: PORT,
  routes: (app: Express) => {
    app.use("/api/v1/users", userRouter);
  },
} as any);

