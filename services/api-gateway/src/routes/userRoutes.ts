import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { rabbitMQService } from "../services/rabbitmq.js";
import { extractToken, type AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { ResponseBuilder } from "../utils/responseBuilder.js";
import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const userRouter = Router();

// Apply token extraction middleware
userRouter.use(extractToken);

/**
 * GET /api/v1/users/profile
 * Get user profile
 */
userRouter.get("/profile", async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    if (!req.user) {
      builder
        .status(401)
        .withMessage("Not authenticated")
        .withError("Not authenticated")
        .withRequestContext({ method: req.method, url: req.originalUrl });
      return res.status(401).json(builder.build());
    }

    const response = await rabbitMQService.sendMessage(
      "user",
      "getProfile",
      {},
      { userId: req.user.id }
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "User profile retrieved successfully" : response.error?.message || "Failed to retrieve profile")
      .withData(response.data)
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in get profile route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * PUT /api/v1/users/profile
 * Update user profile
 */
userRouter.put("/profile", async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    if (!req.user) {
      builder
        .status(401)
        .withMessage("Not authenticated")
        .withError("Not authenticated")
        .withRequestContext({ method: req.method, url: req.originalUrl });
      return res.status(401).json(builder.build());
    }

    const response = await rabbitMQService.sendMessage(
      "user",
      "updateProfile",
      req.body,
      { userId: req.user.id }
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "Profile updated successfully" : response.error?.message || "Profile update failed")
      .withData(response.data)
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in update profile route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * PUT /api/v1/users/profile-image
 * Update profile image
 */
userRouter.put("/profile-image", async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    if (!req.user) {
      builder
        .status(401)
        .withMessage("Not authenticated")
        .withError("Not authenticated")
        .withRequestContext({ method: req.method, url: req.originalUrl });
      return res.status(401).json(builder.build());
    }

    // Handle file upload - pass file buffer to service
    const file = (req as any).file || (req as any).files?.image?.[0];
    
    const response = await rabbitMQService.sendMessage(
      "user",
      "updateProfileImage",
      {
        file: file ? {
          buffer: file.buffer?.toString("base64"),
          mimetype: file.mimetype,
          originalname: file.originalname,
        } : null,
      },
      { userId: req.user.id }
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "Profile image updated successfully" : response.error?.message || "Profile image update failed")
      .withData(response.data)
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in update profile image route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * POST /api/v1/users/change-password
 * Change user password
 */
userRouter.post("/change-password", async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    if (!req.user) {
      builder
        .status(401)
        .withMessage("Not authenticated")
        .withError("Not authenticated")
        .withRequestContext({ method: req.method, url: req.originalUrl });
      return res.status(401).json(builder.build());
    }

    const response = await rabbitMQService.sendMessage(
      "user",
      "changePassword",
      req.body,
      { userId: req.user.id }
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "Password changed successfully" : response.error?.message || "Password change failed")
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in change password route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * GET /api/v1/users/events
 * Get user registered events
 */
userRouter.get("/events", async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    if (!req.user) {
      builder
        .status(401)
        .withMessage("Not authenticated")
        .withError("Not authenticated")
        .withRequestContext({ method: req.method, url: req.originalUrl });
      return res.status(401).json(builder.build());
    }

    const response = await rabbitMQService.sendMessage(
      "user",
      "getUserEvents",
      {},
      { userId: req.user.id }
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "User events retrieved successfully" : response.error?.message || "Failed to retrieve events")
      .withData(response.data)
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in get user events route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * GET /api/v1/users/organized-events
 * Get organized events
 */
userRouter.get("/organized-events", async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    if (!req.user) {
      builder
        .status(401)
        .withMessage("Not authenticated")
        .withError("Not authenticated")
        .withRequestContext({ method: req.method, url: req.originalUrl });
      return res.status(401).json(builder.build());
    }

    const response = await rabbitMQService.sendMessage(
      "user",
      "getOrganizedEvents",
      {},
      { userId: req.user.id }
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "Organized events retrieved successfully" : response.error?.message || "Failed to retrieve organized events")
      .withData(response.data)
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in get organized events route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

export default userRouter;

