import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedUser } from "../types/express";
import prisma from "../config/prisma.js";

// Define a clear interface for the JWT payload
interface JwtPayload {
  id: string;
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // The cookie name should match what you set during login
    const token = req.cookies.sessionId;

    if (!token) {
      return res.status(401).json({ error: "Not authorized, no token" });
    }

    // Verify the token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    if (!decoded) {
      return res.status(401).json({ error: "Not authorized, token failed" });
    }

    // Get user from the token and attach it to the request object
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      // The select query must match the 'AuthenticatedUser' type
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true, // Added to satisfy AuthenticatedUser type
        updatedAt: true, // Added to satisfy AuthenticatedUser type
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    req.user = user as AuthenticatedUser;
    next();
    return;
  } catch (error) {
    console.error(error);
    return res.status(401).json({ error: "Not authorized, token invalid" });
  }
};
