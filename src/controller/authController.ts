// src/controller/authController.ts
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/express.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { z } from "zod";
import { createLogger, format, transports } from "winston";
import prisma from "../config/prisma.js";
import { ResponseBuilder } from "../utils/responseHandler.js";
import { env } from "../config/env.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { getImageUrl } from "@/utils/commonFunction.js";

// Structured logger
const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const RegisterSchema = z
  .object({
    email: z.email({ error: "Invalid email address" }).trim().toLowerCase(),
    username: z
      .string({ error: "Username is required" })
      .min(3, { error: "Username must be at least 3 characters" })
      .max(50, { error: "Username cannot exceed 50 characters" })
      .regex(/^[a-zA-Z0-9_]+$/, {
        error: "Username can only contain letters, numbers, and underscores",
      })
      .trim(),
    password: z
      .string({ error: "Password is required" })
      .min(8, { error: "Password must be at least 8 characters long" })
      .max(20, { error: "Password cannot exceed 128 characters" })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]*$/, {
        error:
          "Password must contain at least one lowercase letter, one uppercase letter, one digit, and can include @$!%*?&",
      }),
    gender: z.enum(["Male", "Female", "Other"], {
      error: "Gender is required",
    }),
  })
  .strict();

const LoginSchema = z.object({
  email: z.email({ error: "Invalid email address" }).trim().toLowerCase(),
  password: z
    .string({ error: "Password is required" })
    .min(8, {
      error: "Password must be at least 8 characters long",
    })
    .max(20, {
      error: "Password cannot exceed 20 characters",
    }),
});

const ChangePasswordSchema = z
  .object({
    oldPassword: z
      .string({ error: "Old password is required" })
      .min(8, {
        error: "Old password must be at least 8 characters long",
      })
      .max(20, {
        error: "Old password cannot exceed 20 characters",
      }),
    newPassword: z
      .string({ error: "New password is required" })
      .min(8, {
        error: "New password must be at least 8 characters long",
      })
      .max(20, {
        error: "New password cannot exceed 20 characters",
      })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    confirmPassword: z
      .string({ error: "Confirm password is required" })
      .min(8, {
        error: "Confirm password must be at least 8 characters long",
      })
      .max(20, { error: "Confirm password cannot exceed 20 characters" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "New password must be different",
    path: ["newPassword"],
  });

const ForgotPasswordSchema = z.object({
  email: z.email({ error: "Invalid email address" }).trim().toLowerCase(),
});

const VerifyOtpSchema = z.object({
  email: z.email({ error: "Invalid email address" }).trim().toLowerCase(),
  otp: z
    .string({ error: "OTP is required" })
    .length(6, { error: "OTP must be 6 digits long" }),
});

const ChangeForgotPasswordSchema = z
  .object({
    email: z.email({ error: "Invalid email address" }).trim().toLowerCase(),
    otp: z
      .string({ error: "OTP is required" })
      .length(6, { error: "OTP must be 6 digits long" }),
    newPassword: z
      .string({ error: "New password is required" })
      .min(8, { error: "New password must be at least 8 characters long" })
      .max(20, { error: "New password cannot exceed 20 characters" })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Centralized cookie settings
const setCookie = (
  res: Response,
  token: string | "",
  options: { clear?: boolean } = {}
) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: options.clear ? 0 : 24 * 60 * 60 * 1000,
    expires: options.clear ? new Date(0) : undefined,
  });
};

// Validate environment variables
if (!env.JWT_SECRET) throw new Error("JWT_SECRET is not defined");
const emailConfig = {
  user: env.EMAIL_USER,
  pass: env.EMAIL_PASS,
};
if (!emailConfig.user || !emailConfig.pass)
  throw new Error("Email configuration is incomplete");

// Initialize nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: emailConfig,
});

// Generate JWT
const generateToken = (userId: string) =>
  jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: "1d",
    algorithm: "HS256",
  });

/**
 * Register a new user
 * @route POST /api/v1/auth/users/register
 */
export const register = async (req: Request, res: Response) => {
  const requestId = crypto.randomUUID();

  // Validate input
  const result = RegisterSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      issue: issue.message,
    }));
    logger.warn("Invalid registration input", {
      requestId,
      body: req.body,
      errors,
    });
    return new ResponseBuilder(res)
      .status(400)
      .message("Invalid input provided")
      .withValidationErrors(errors)
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  const { email, username, password, gender } = result.data;

  // Check for existing user
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    logger.warn("User already exists", { requestId, email });
    return new ResponseBuilder(res)
      .status(409)
      .message("User already exists")
      .withErrorCode(ERROR_CODES.USER_EXISTS)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  // Also Check for existing username
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUsername) {
    logger.warn("Username already exists", { requestId, username });
    return new ResponseBuilder(res)
      .status(409)
      .message("Username already exists")
      .withErrorCode(ERROR_CODES.USERNAME_EXISTS)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const imageUrl = getImageUrl(gender, username);

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: hashedPassword,
        image: imageUrl,
        role: "USER",
        gender,
      },
      select: {
        id: true,
        email: true,
        username: true,
        gender: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const token = generateToken(newUser.id);
    setCookie(res, token);

    logger.info("User registered successfully", {
      requestId,
      userId: newUser.id,
    });
    return new ResponseBuilder(res)
      .status(201)
      .message("User registered successfully")
      .withData({ ...newUser, token })
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Registration error", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to register user")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.REGISTRATION_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

/**
 * Log in a user
 * @route POST /api/v1/auth/users/login
 */
export const login = async (req: Request, res: Response) => {
  const requestId = crypto.randomUUID();

  // Validate input
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      issue: issue.message,
    }));
    logger.warn("Invalid login input", {
      requestId,
      errors,
    });
    return new ResponseBuilder(res)
      .status(400)
      .message("Email and password are required")
      .withValidationErrors(errors)
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  const { email, password } = result.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        gender: true,
        image: true,
        role: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user || !user.passwordHash) {
      logger.warn("Invalid credentials", { requestId, email });
      return new ResponseBuilder(res)
        .status(401)
        .message("Invalid credentials")
        .withErrorCode(ERROR_CODES.INVALID_CREDENTIALS)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      logger.warn("Invalid password", { requestId, email });
      return new ResponseBuilder(res)
        .status(401)
        .message("Invalid credentials")
        .withErrorCode(ERROR_CODES.INVALID_CREDENTIALS)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    const token = generateToken(user.id);
    setCookie(res, token);

    const responseData = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      gender: user.gender,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      token,
    };

    logger.info("User logged in successfully", { requestId, userId: user.id });
    return new ResponseBuilder(res)
      .status(200)
      .message("User logged in successfully")
      .withData(responseData)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Login error", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to log in")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.LOGIN_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

/**
 * Log out a user
 * @route POST /api/v1/auth/users/logout
 */
export const logout = (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const user = req.user;

  if (!user) {
    logger.warn("Logout attempted without authentication", { requestId });
    return new ResponseBuilder(res)
      .status(401)
      .message("User not authenticated")
      .withErrorCode(ERROR_CODES.NOT_AUTHENTICATED)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  try {
    setCookie(res, "", { clear: true });
    logger.info("User logged out successfully", { requestId, userId: user.id });
    return new ResponseBuilder(res)
      .status(200)
      .message("Logged out successfully")
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Logout error", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to log out")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.LOGOUT_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

/**
 * Get authenticated user details
 * @route GET /api/v1/auth/users/me
 */
export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const user = req.user;

  if (!user) {
    logger.warn("GetMe attempted without authentication", { requestId });
    return new ResponseBuilder(res)
      .status(401)
      .message("User not authenticated")
      .withErrorCode(ERROR_CODES.NOT_AUTHENTICATED)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  logger.info("User details fetched", { requestId, userId: user.id });
  return new ResponseBuilder(res)
    .status(200)
    .message("User details fetched successfully")
    .withData(user)
    .withRequestId(requestId)
    .withLogging(env.NODE_ENV !== "production")
    .send();
};

/**
 * Change authenticated user's password
 * @route POST /api/v1/auth/users/change-password
 */
export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const requestId = crypto.randomUUID();
  const user = req.user;

  if (!user) {
    logger.warn("Change password attempted without authentication", {
      requestId,
    });
    return new ResponseBuilder(res)
      .status(401)
      .message("User not authenticated")
      .withErrorCode(ERROR_CODES.NOT_AUTHENTICATED)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  // Validate input
  const result = ChangePasswordSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      issue: issue.message,
    }));
    logger.warn("Invalid change password input", {
      requestId,
      errors: result.error.issues,
    });
    return new ResponseBuilder(res)
      .status(400)
      .message("Invalid input provided")
      .withValidationErrors(errors)
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  const { oldPassword, newPassword } = result.data;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!dbUser || !dbUser.passwordHash) {
      logger.warn("User not found for password change", {
        requestId,
        userId: user.id,
      });
      return new ResponseBuilder(res)
        .status(404)
        .message("User not found")
        .withErrorCode(ERROR_CODES.USER_NOT_FOUND)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    const isMatch = await bcrypt.compare(oldPassword, dbUser.passwordHash);
    if (!isMatch) {
      logger.warn("Incorrect old password", { requestId, userId: user.id });
      return new ResponseBuilder(res)
        .status(401)
        .message("Old password is incorrect")
        .withErrorCode(ERROR_CODES.INVALID_OLD_PASSWORD)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    logger.info("Password changed successfully", {
      requestId,
      userId: user.id,
    });
    return new ResponseBuilder(res)
      .status(200)
      .message("Password updated successfully")
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Change password error", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to change password")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.CHANGE_PASSWORD_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

/**
 * Send password reset OTP
 * @route POST /api/v1/auth/users/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response) => {
  const requestId = crypto.randomUUID();

  // Validate input
  const result = ForgotPasswordSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      issue: issue.message,
    }));
    logger.warn("Invalid forgot password input", {
      requestId,
      errors: result.error.issues,
    });
    return new ResponseBuilder(res)
      .status(400)
      .message("Invalid input provided")
      .withValidationErrors(errors)
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  const { email } = result.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      logger.info(
        "No user found for OTP, returning success to prevent enumeration",
        { requestId, email }
      );
      return new ResponseBuilder(res)
        .status(200)
        .message("OTP sent successfully")
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcrypt.hash(otp, 10);

    // Delete any existing OTPs for this email and create a new one.
    await prisma.$transaction([
      prisma.otp.deleteMany({ where: { email } }),
      prisma.otp.create({
        data: {
          email,
          code: hashedOTP,
          expiresAt: new Date(Date.now() + 60 * 1000),
        },
      }),
    ]);

    await transporter.sendMail({
      from: emailConfig.user,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP is ${otp}. It expires in 1 minute.`,
    });

    logger.info("OTP sent successfully", { requestId, email });
    return new ResponseBuilder(res)
      .status(200)
      .message("OTP sent successfully")
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Forgot password error", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to send OTP")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.OTP_SEND_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

/**
 * Helper for verifying OTP
 */
const verifyOtp = async (email: string, otp: string) => {
  const storedOtp = await prisma.otp.findFirst({
    where: { email, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "desc" },
  });

  if (!storedOtp) {
    logger.warn("OTP expired or not found", { email });
    throw new Error("OTP expired or not found");
  }

  const isOtpValid = await bcrypt.compare(otp, storedOtp.code);
  if (!isOtpValid) {
    logger.warn("Invalid OTP", { email });
    throw new Error("Invalid OTP");
  }

  return storedOtp;
};

/**
 * Verify password reset OTP
 * @route POST /api/v1/auth/users/verify-otp
 */
export const verifyOTP = async (req: Request, res: Response) => {
  const requestId = crypto.randomUUID();

  // Validate input
  const result = VerifyOtpSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      issue: issue.message,
    }));
    logger.warn("Invalid OTP verification input", {
      requestId,
      errors: result.error.issues,
    });
    return new ResponseBuilder(res)
      .status(400)
      .message("Invalid input provided")
      .withValidationErrors(errors)
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  const { email, otp } = result.data;

  try {
    await verifyOtp(email, otp);
    logger.info("OTP verified successfully", { requestId, email });
    return new ResponseBuilder(res)
      .status(200)
      .message("OTP verified successfully")
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error: any) {
    logger.warn("OTP verification failed", { requestId, error: error.message });
    return new ResponseBuilder(res)
      .status(400)
      .message(error.message)
      .withErrorCode(
        error.message.includes("expired")
          ? ERROR_CODES.OTP_EXPIRED
          : ERROR_CODES.INVALID_OTP
      )
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

/**
 * Change password using OTP
 * @route POST /api/v1/auth/users/change-forgot-password
 */
export const changeForgotPassword = async (req: Request, res: Response) => {
  const requestId = crypto.randomUUID();

  // Validate input
  const result = ChangeForgotPasswordSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      issue: issue.message,
    }));
    logger.warn("Invalid change forgot password input", {
      requestId,
      errors: result.error.issues,
    });
    return new ResponseBuilder(res)
      .status(400)
      .message("Invalid input provided")
      .withValidationErrors(errors)
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  const { email, otp, newPassword } = result.data;

  try {
    const storedOtp = await verifyOtp(email, otp);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { passwordHash: hashedPassword },
    });
    await prisma.otp.delete({ where: { id: storedOtp.id } });

    logger.info("Password changed successfully via OTP", { requestId, email });
    return new ResponseBuilder(res)
      .status(200)
      .message("Password changed successfully")
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error: any) {
    logger.warn("Change forgot password error", {
      requestId,
      error: error.message,
    });
    return new ResponseBuilder(res)
      .status(
        error.message.includes("expired") || error.message.includes("OTP")
          ? 400
          : 500
      )
      .message(
        error.message.includes("expired")
          ? "OTP expired"
          : error.message.includes("OTP")
          ? "Invalid OTP"
          : "Failed to change password"
      )
      .withError(error as Error)
      .withErrorCode(
        error.message.includes("expired")
          ? ERROR_CODES.OTP_EXPIRED
          : error.message.includes("OTP")
          ? ERROR_CODES.INVALID_OTP
          : ERROR_CODES.CHANGE_PASSWORD_ERROR
      )
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};
