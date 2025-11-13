import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../shared/types/express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createLogger, format, transports } from "winston";
import prisma from "../config/prisma";
import { ResponseBuilder } from "../../shared/utils/responseHandler";
import { env } from "../../shared/config/env";
import { ERROR_CODES } from "../../shared/constants/errorCodes";

// Structured logger
const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const generateToken = (id: string, email: string, role: "ADMIN") => {
  return jwt.sign({ id, email, role }, env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

export const loginAdmin = async (req: Request, res: Response) => {
  const requestId = crypto.randomUUID();
  const { email, password } = req.body;

  if (!email || !password) {
    logger.warn("Invalid admin login input", { requestId, email });
    return new ResponseBuilder(res)
      .status(400)
      .message("Email and password are required")
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  try {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      logger.warn("Admin not found", { requestId, email });
      return new ResponseBuilder(res)
        .status(401)
        .message("Invalid credentials")
        .withErrorCode(ERROR_CODES.INVALID_CREDENTIALS)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash!);
    if (!isMatch) {
      logger.warn("Invalid admin password", { requestId, email });
      return new ResponseBuilder(res)
        .status(401)
        .message("Invalid credentials")
        .withErrorCode(ERROR_CODES.INVALID_CREDENTIALS)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    const token = generateToken(admin.id, admin.email, "ADMIN");
    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      maxAge: 60 * 60 * 1000,
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    });

    logger.info("Admin logged in successfully", { requestId, adminId: admin.id });
    return new ResponseBuilder(res)
      .status(200)
      .message("Admin login successful")
      .withData({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        token,
      })
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Admin login error", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Admin login failed. Please try again later")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.LOGIN_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

export const changeAdminPassword = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const admin = (req as any).admin;
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!admin) {
    logger.warn("Change admin password attempted without authentication", { requestId });
    return new ResponseBuilder(res)
      .status(401)
      .message("Admin not authenticated")
      .withErrorCode(ERROR_CODES.NOT_AUTHENTICATED)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  if (!oldPassword || !newPassword || !confirmPassword) {
    logger.warn("Missing password fields", { requestId, adminId: admin.id });
    return new ResponseBuilder(res)
      .status(400)
      .message("All password fields are required")
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  if (newPassword !== confirmPassword) {
    logger.warn("Password confirmation mismatch", { requestId, adminId: admin.id });
    return new ResponseBuilder(res)
      .status(400)
      .message("New password and confirm password should be same")
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  if (oldPassword === newPassword) {
    logger.warn("Old and new password are same", { requestId, adminId: admin.id });
    return new ResponseBuilder(res)
      .status(400)
      .message("Old password and new password shouldn't be same")
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  try {
    const adminRecord = await prisma.admin.findUnique({ where: { id: admin.id } });
    if (!adminRecord) {
      logger.warn("Admin not found for password change", { requestId, adminId: admin.id });
      return new ResponseBuilder(res)
        .status(404)
        .message("Admin not found")
        .withErrorCode(ERROR_CODES.USER_NOT_FOUND)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    const isMatch = await bcrypt.compare(oldPassword, adminRecord.passwordHash!);
    if (!isMatch) {
      logger.warn("Incorrect old password", { requestId, adminId: admin.id });
      return new ResponseBuilder(res)
        .status(401)
        .message("Old password is incorrect")
        .withErrorCode(ERROR_CODES.INVALID_OLD_PASSWORD)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash: hashedPassword },
    });

    logger.info("Admin password changed successfully", { requestId, adminId: admin.id });
    return new ResponseBuilder(res)
      .status(200)
      .message("Password updated successfully")
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Change admin password error", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Password change failed. Please try again later")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.CHANGE_PASSWORD_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};
