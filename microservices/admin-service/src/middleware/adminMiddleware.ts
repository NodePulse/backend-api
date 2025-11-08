import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../shared/config/env.js";

const JWT_SECRET = env.JWT_SECRET;

interface JwtPayload {
  id: number;
  email: string;
  role: string;
}

export const protectAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.json(401).json({ error: "Not authorized, Invalid token" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!decoded) {
      return res.status(401).json({ error: "Not authorized, token failed" });
    }

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({ message: "Not authorized as admin" });
    }

    (req as any).admin = decoded;
    next();
    return;
  } catch (err) {
    return res.status(401).json({ message: "Token failed" });
  }
};
