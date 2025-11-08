import type { Express } from "express";
import adminRouter from "./routes/adminRoutes.js";
import { createApp } from "../../shared/utils/appSetup.js";
import { env } from "../../shared/config/env.js";

const PORT = env.PORT || 3005;

// Create and configure the Express app
createApp({
  serviceName: "Admin Service",
  port: PORT,
  routes: (app: Express) => {
    app.use("/api/v1/auth/admins", adminRouter);
  },
});

