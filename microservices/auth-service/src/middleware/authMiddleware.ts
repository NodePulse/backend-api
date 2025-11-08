// src/middleware/auth.ts
import type { NextFunction, Response } from "express";
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from "../../shared/types/express";
import jwt, { JwtPayload as JwtPayloadOriginal } from "jsonwebtoken";
import { z } from "zod";
import crypto from "crypto";
import prisma from "../../shared/config/prisma";
import { createLogger, format, transports } from "winston";
import { ResponseBuilder } from "../../shared/utils/responseHandler";
import { getCache, setCache } from "../../shared/utils/cache";
// import { ERROR_CODES } from "../constants/errorCodes";

// Structured logger
const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

// Environment variable validation
const authEnvSchema = z.object({
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  NODE_ENV: z.string().default("development"),
});
const authEnv = authEnvSchema.parse(process.env);

// JWT payload interface
interface JwtPayload extends JwtPayloadOriginal {
  id: string;
  role?: string;
}

// Error codes (in constants/errorCodes.ts)
export const ERROR_CODES = {
  NO_TOKEN: "NO_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  AUTH_ERROR: "AUTH_ERROR",
  JWT_SECRET_MISSING: "JWT_SECRET_MISSING",
  INSECURE_REQUEST: "INSECURE_REQUEST",
  FORBIDDEN: "FORBIDDEN",
};

/**
 * Middleware to protect routes by verifying JWT in a cookie and attaching the user to the request.
 * @param req - Express Request object with optional user property
 * @param res - Express Response object
 * @param next - Express NextFunction to pass control to the next middleware
 * @throws Returns 401 if token is missing or invalid, 404 if user not found, or 500 for server errors
 * @example
 * router.get("/protected", protect, (req, res) => {
 *   res.json({ user: req.user });
 * });
 */
export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const requestId = crypto.randomUUID();

  try {
    // Validate JWT_SECRET
    const jwtSecret = authEnv.JWT_SECRET;
    if (!jwtSecret) {
      logger.error("JWT_SECRET is not defined", { requestId });
      throw new Error("Server configuration error");
    }

    // Check for secure connection in production
    if (authEnv.NODE_ENV === "production" && !req.secure) {
      logger.warn("Insecure request detected", {
        requestId,
        method: req.method,
        url: req.originalUrl,
      });
      return new ResponseBuilder(res)
        .status(403)
        .message("Secure connection required for authentication")
        .withErrorCode(ERROR_CODES.INSECURE_REQUEST)
        .withLogging(true)
        .withRequestId(requestId)
        .withRequestContext({ method: req.method, url: req.originalUrl })
        .send();
    }

    // Extract and validate token
    const token = req.cookies?.token;
    if (
      !token ||
      typeof token !== "string" ||
      !token.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
    ) {
      logger.warn("Invalid token format", {
        requestId,
        method: req.method,
        url: req.originalUrl,
      });
      return new ResponseBuilder(res)
        .status(401)
        .message("Not authorized, invalid token format")
        .withErrorCode(ERROR_CODES.TOKEN_INVALID)
        .withLogging(authEnv.NODE_ENV !== "production")
        .withRequestId(requestId)
        .withRequestContext({ method: req.method, url: req.originalUrl })
        .send();
    }

    // Verify token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, jwtSecret, {
        algorithms: ["HS256"],
      }) as JwtPayload;
    } catch (error) {
      const errorMessage =
        error instanceof jwt.TokenExpiredError
          ? "Token expired"
          : "Invalid token";
      logger.warn(`Token verification failed: ${errorMessage}`, {
        requestId,
        token,
        method: req.method,
        url: req.originalUrl,
      });
      return new ResponseBuilder(res)
        .status(401)
        .message(`Not authorized, ${errorMessage.toLowerCase()}`)
        .withError(error as Error)
        .withErrorCode(
          error instanceof jwt.TokenExpiredError
            ? ERROR_CODES.TOKEN_EXPIRED
            : ERROR_CODES.TOKEN_INVALID
        )
        .withLogging(authEnv.NODE_ENV !== "production")
        .withRequestId(requestId)
        .withRequestContext({ method: req.method, url: req.originalUrl })
        .send();
    }

    // Check cache for user
    const cacheKey = `user:${decoded.id}`;
    let user: AuthenticatedUser | null = await getCache(cacheKey);
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (user) {
        await setCache(cacheKey, user, 300); // Cache for 5 minutes
      }
    }

    if (!user) {
      logger.warn("User not found for valid token", {
        requestId,
        userId: decoded.id,
        method: req.method,
        url: req.originalUrl,
      });
      return new ResponseBuilder(res)
        .status(404)
        .message("User not found")
        .withErrorCode(ERROR_CODES.USER_NOT_FOUND)
        .withLogging(authEnv.NODE_ENV !== "production")
        .withRequestId(requestId)
        .withRequestContext({ method: req.method, url: req.originalUrl })
        .send();
    }

    // Attach user to request
    req.user = user;
    logger.info("User authenticated successfully", {
      requestId,
      userId: user.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      method: req.method,
      url: req.originalUrl,
    });
    next();
  } catch (error: unknown) {
    logger.error("Authentication error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
      method: req.method,
      url: req.originalUrl,
    });
    return new ResponseBuilder(res)
      .status(500)
      .message("Internal server error")
      .withError(error instanceof Error ? error : new Error(String(error)))
      .withErrorCode(ERROR_CODES.AUTH_ERROR)
      .withLogging(authEnv.NODE_ENV !== "production")
      .withRequestId(requestId)
      .withRequestContext({ method: req.method, url: req.originalUrl })
      .send();
  }
};

/**
 * Middleware to authorize access based on user role.
 * @param role - Required role for access
 * @returns Middleware function
 * @example
 * router.get("/admin", protect, authorize("admin"), (req, res) => {
 *   res.json({ message: "Admin access granted" });
 * });
 */
export function authorize(role: string) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    const requestId = crypto.randomUUID();
    if (!req.user || req.user.role !== role) {
      logger.warn("Unauthorized role access", {
        requestId,
        userId: req.user?.id,
        requiredRole: role,
        method: req.method,
        url: req.originalUrl,
      });
      return new ResponseBuilder(res)
        .status(403)
        .message(`Requires ${role} role`)
        .withErrorCode(ERROR_CODES.FORBIDDEN)
        .withLogging(authEnv.NODE_ENV !== "production")
        .withRequestId(requestId)
        .withRequestContext({ method: req.method, url: req.originalUrl })
        .send();
    }
    next();
  };
}
