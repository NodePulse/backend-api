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

const authRouter = Router();

// Apply token extraction middleware
authRouter.use(extractToken);

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
authRouter.post("/register", async (req: Request, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    const response = await rabbitMQService.sendMessage(
      "auth",
      "register",
      req.body
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "Registration successful" : response.error?.message || "Registration failed")
      .withData(response.data)
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in register route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * POST /api/v1/auth/login
 * Login a user
 */
authRouter.post("/login", async (req: Request, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    const response = await rabbitMQService.sendMessage(
      "auth",
      "login",
      req.body
    );

    // Set cookie if token is present in response
    if (response.data?.token) {
      res.cookie("token", response.data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
    }

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "Login successful" : response.error?.message || "Login failed")
      .withData(response.data)
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in login route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout a user
 */
authRouter.post("/logout", async (req: AuthenticatedRequest, res: Response) => {
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
      "auth",
      "logout",
      {},
      { userId: req.user.id }
    );

    // Clear cookie
    res.clearCookie("token");

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "Logout successful" : response.error?.message || "Logout failed")
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in logout route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * GET /api/v1/auth/me
 * Get authenticated user details
 */
authRouter.get("/me", async (req: AuthenticatedRequest, res: Response) => {
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
      "auth",
      "getMe",
      {},
      { userId: req.user.id }
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "User profile retrieved successfully" : response.error?.message || "Failed to retrieve user details")
      .withData(response.data)
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in getMe route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * POST /api/v1/auth/change-password
 * Change password for authenticated user
 */
authRouter.post("/change-password", async (req: AuthenticatedRequest, res: Response) => {
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
      "auth",
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
    logger.error("Error in change-password route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * POST /api/v1/auth/forgot-password
 * Request password reset OTP
 */
authRouter.post("/forgot-password", async (req: Request, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    const response = await rabbitMQService.sendMessage(
      "auth",
      "forgotPassword",
      req.body
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "Password reset OTP sent successfully" : response.error?.message || "Failed to send OTP")
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in forgot-password route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * POST /api/v1/auth/verify-otp
 * Verify OTP for password reset
 */
authRouter.post("/verify-otp", async (req: Request, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    const response = await rabbitMQService.sendMessage(
      "auth",
      "verifyOTP",
      req.body
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "OTP verified successfully" : response.error?.message || "OTP verification failed")
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in verify-otp route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * POST /api/v1/auth/change-forgot-password
 * Change password using OTP
 */
authRouter.post("/change-forgot-password", async (req: Request, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    const response = await rabbitMQService.sendMessage(
      "auth",
      "changeForgotPassword",
      req.body
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "Password reset successful" : response.error?.message || "Password reset failed")
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in change-forgot-password route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

export default authRouter;

