import type { Express } from "express";
import eventRouter from "./routes/eventRoutes.js";
import { createApp } from "../../shared/utils/appSetup.js";
import { env } from "../../shared/config/env.js";

const PORT = env.PORT || 3003;

// Create and configure the Express app
createApp({
  serviceName: "Event Service",
  port: PORT,
  routes: (app: Express) => {
    app.use("/api/v1/events", eventRouter);
  },
});

