// src/routes/index.ts
import { Router } from "express";
import authRouter from "./authRoutes.js";
import accountRouter from "./accountRoutes.js";
import adminRouter from "./adminRoutes.js";
import eventRouter from "./eventRoutes.js";
import userRouter from "./userRoutes.js";
import transactionRouter from "./transactionRoutes.js";
import { createLogger, format, transports } from "winston";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { protect, authorize } from "@/middleware/authMiddleware.js";

// Logger for route activity
const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const router = Router();

// Log incoming requests
router.use((req: Request, res: Response, next: NextFunction) => {
  logger.info("Incoming request", {
    method: req.method,
    url: req.originalUrl,
    requestId: crypto.randomUUID(),
  });
  next();
});

// Mount authentication routes for users
router.use("/auth/users", authRouter);

// Mount authentication routes for admins
router.use("/auth/admins", adminRouter);

// Mount account management routes (admin-only)
// router.use("/accounts", protect, authorize("admin"), accountRouter);

// Mount event-related routes for users
router.use("/events", protect, eventRouter);

// Mount user profile and management routes
router.use("/users", protect, userRouter);

// Mount transaction-related routes
router.use("/transactions", protect, transactionRouter);

export default router;
