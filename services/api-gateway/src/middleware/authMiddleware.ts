import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware to extract and validate JWT token
 * This is a lightweight check - full validation happens in auth-service
 */
export const extractToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET, {
          algorithms: ["HS256"],
        }) as { id: string; email?: string; role?: string };

        // Token only contains id, email and role are optional
        if (decoded.id) {
          req.user = {
            id: decoded.id,
            email: decoded.email || "",
            role: decoded.role || "USER",
          };
          logger.debug("Token validated successfully", { userId: decoded.id });
        }
      } catch (error: any) {
        // Token invalid or expired - clear it
        logger.warn("Token validation failed in gateway", { 
          error: error.message,
          tokenPresent: !!token 
        });
        // Don't set req.user if token is invalid
        req.user = undefined;
      }
    } else {
      req.user = undefined;
    }
    next();
  } catch (error) {
    logger.error("Error in extractToken middleware", { error });
    req.user = undefined;
    next();
  }
};

