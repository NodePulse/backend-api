import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { z } from "zod";
import { createLogger, format, transports } from "winston";
import prisma from "../config/prisma.js";
import { env } from "../config/env.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { getImageUrl } from "../utils/commonFunction.js";
import { ResponseBuilder } from "../utils/responseBuilder.js";
import { eventPublisher } from "../services/eventPublisher.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

// Validation schemas
const RegisterSchema = z
  .object({
    email: z.email({ message: "Invalid email address" }).trim().toLowerCase(),
    username: z
      .string({ message: "Username is required" })
      .min(3, { message: "Username must be at least 3 characters" })
      .max(50, { message: "Username cannot exceed 50 characters" })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message: "Username can only contain letters, numbers, and underscores",
      })
      .trim(),
    password: z
      .string({ message: "Password is required" })
      .min(8, { message: "Password must be at least 8 characters long" })
      .max(20, { message: "Password cannot exceed 128 characters" })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]*$/, {
        message:
          "Password must contain at least one lowercase letter, one uppercase letter, one digit, and can include @$!%*?&",
      }),
    gender: z.enum(["Male", "Female", "Other"], {
      message: "Gender is required",
    }),
  })
  .strict();

const LoginSchema = z.object({
  email: z.email({ message: "Invalid email address" }).trim().toLowerCase(),
  password: z
    .string({ message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(20, { message: "Password cannot exceed 20 characters" }),
});

const ChangePasswordSchema = z
  .object({
    oldPassword: z
      .string({ message: "Old password is required" })
      .min(8, { message: "Old password must be at least 8 characters long" })
      .max(20, { message: "Old password cannot exceed 20 characters" }),
    newPassword: z
      .string({ message: "New password is required" })
      .min(8, { message: "New password must be at least 8 characters long" })
      .max(20, { message: "New password cannot exceed 20 characters" })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    confirmPassword: z
      .string({ message: "Confirm password is required" })
      .min(8, { message: "Confirm password must be at least 8 characters long" })
      .max(20, { message: "Confirm password cannot exceed 20 characters" }),
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
  email: z.email({ message: "Invalid email address" }).trim().toLowerCase(),
});

const VerifyOtpSchema = z.object({
  email: z.email({ message: "Invalid email address" }).trim().toLowerCase(),
  otp: z.string({ message: "OTP is required" }).length(6, { message: "OTP must be 6 digits long" }),
});

const ChangeForgotPasswordSchema = z
  .object({
    email: z.email({ message: "Invalid email address" }).trim().toLowerCase(),
    otp: z.string({ message: "OTP is required" }).length(6, { message: "OTP must be 6 digits long" }),
    newPassword: z
      .string({ message: "New password is required" })
      .min(8, { message: "New password must be at least 8 characters long" })
      .max(20, { message: "New password cannot exceed 20 characters" })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Email transporter (only created if email credentials are provided)
const getTransporter = () => {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  });
};

// Generate JWT
const generateToken = (userId: string) =>
  jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: "1d",
    algorithm: "HS256",
  });

// Verify OTP helper
const verifyOtp = async (email: string, otp: string) => {
  const storedOtp = await prisma.otp.findFirst({
    where: { email, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "desc" },
  });

  if (!storedOtp) {
    throw new Error("OTP expired or not found");
  }

  const isOtpValid = await bcrypt.compare(otp, storedOtp.code);
  if (!isOtpValid) {
    throw new Error("Invalid OTP");
  }

  return storedOtp;
};

/**
 * Register a new user
 */
export const register = async (requestId: string, data: any) => {
  const builder = new ResponseBuilder(requestId);

  try {
    const result = RegisterSchema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        issue: issue.message,
      }));
      logger.warn("Invalid registration input", { requestId, errors });
      return builder
        .status(400)
        .withError("Invalid input provided", ERROR_CODES.INVALID_INPUT, errors)
        .build();
    }

    const { email, username, password, gender } = result.data;

    // Check for existing user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      logger.warn("User already exists", { requestId, email });
      return builder
        .status(409)
        .withError("User already exists", ERROR_CODES.USER_EXISTS)
        .build();
    }

    // Check for existing username
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      logger.warn("Username already exists", { requestId, username });
      return builder
        .status(409)
        .withError("Username already exists", ERROR_CODES.USERNAME_EXISTS)
        .build();
    }

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
        name: true,
        gender: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const token = generateToken(newUser.id);

    // Publish user created event to user-service
    try {
      await eventPublisher.publishUserCreated({
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        name: newUser.name || null,
        image: newUser.image || null,
        role: newUser.role,
        gender: newUser.gender || null,
      });
    } catch (error) {
      logger.error("Failed to publish user created event", { requestId, error, userId: newUser.id });
      // Don't fail registration if event publishing fails
    }

    logger.info("User registered successfully", { requestId, userId: newUser.id });
    return builder
      .status(201)
      .withData({ ...newUser, token })
      .build();
  } catch (error: any) {
    logger.error("Registration error", { requestId, error });
    return builder
      .status(500)
      .withError("Registration failed. Please try again later", ERROR_CODES.REGISTRATION_ERROR)
      .build();
  }
};

/**
 * Log in a user
 */
export const login = async (requestId: string, data: any) => {
  const builder = new ResponseBuilder(requestId);

  try {
    const result = LoginSchema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        issue: issue.message,
      }));
      logger.warn("Invalid login input", { requestId, errors });
      return builder
        .status(400)
        .withError("Invalid input provided", ERROR_CODES.INVALID_INPUT, errors)
        .build();
    }

    const { email, password } = result.data;

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
      return builder
        .status(401)
        .withError("Invalid credentials", ERROR_CODES.INVALID_CREDENTIALS)
        .build();
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      logger.warn("Invalid password", { requestId, email });
      return builder
        .status(401)
        .withError("Invalid credentials", ERROR_CODES.INVALID_CREDENTIALS)
        .build();
    }

    const token = generateToken(user.id);

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
    return builder
      .status(200)
      .withData(responseData)
      .build();
  } catch (error: any) {
    logger.error("Login error", { requestId, error });
    return builder
      .status(500)
      .withError("Login failed. Please try again later", ERROR_CODES.LOGIN_ERROR)
      .build();
  }
};

/**
 * Log out a user
 */
export const logout = async (requestId: string, headers: any) => {
  const builder = new ResponseBuilder(requestId);

  try {
    logger.info("User logged out successfully", { requestId, userId: headers?.userId });
    return builder
      .status(200)
      .build();
  } catch (error: any) {
    logger.error("Logout error", { requestId, error });
    return builder
      .status(500)
      .withError("Logout failed. Please try again later", ERROR_CODES.LOGOUT_ERROR)
      .build();
  }
};

/**
 * Get authenticated user details
 */
export const getMe = async (requestId: string, headers: any) => {
  const builder = new ResponseBuilder(requestId);

  try {
    const userId = headers?.userId;
    if (!userId) {
      return builder
        .status(401)
        .withError("User not authenticated", ERROR_CODES.NOT_AUTHENTICATED)
        .build();
    }

    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        gender: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!userProfile) {
      logger.warn("User not found", { requestId, userId });
      return builder
        .status(404)
        .withError("User not found", ERROR_CODES.USER_NOT_FOUND)
        .build();
    }

    logger.info("User details fetched", { requestId, userId });
    return builder
      .status(200)
      .withData(userProfile)
      .build();
  } catch (error: any) {
    logger.error("Error fetching user profile", { requestId, error });
    return builder
      .status(500)
      .withError("Failed to fetch user profile. Please try again later", ERROR_CODES.INTERNAL_SERVER_ERROR)
      .build();
  }
};

/**
 * Change authenticated user's password
 */
export const changePassword = async (requestId: string, data: any, headers: any) => {
  const builder = new ResponseBuilder(requestId);

  try {
    const userId = headers?.userId;
    if (!userId) {
      return builder
        .status(401)
        .withError("User not authenticated", ERROR_CODES.NOT_AUTHENTICATED)
        .build();
    }

    const result = ChangePasswordSchema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        issue: issue.message,
      }));
      logger.warn("Invalid change password input", { requestId, errors });
      return builder
        .status(400)
        .withError("Invalid input provided", ERROR_CODES.INVALID_INPUT, errors)
        .build();
    }

    const { oldPassword, newPassword } = result.data;

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!dbUser || !dbUser.passwordHash) {
      logger.warn("User not found for password change", { requestId, userId });
      return builder
        .status(404)
        .withError("User not found", ERROR_CODES.USER_NOT_FOUND)
        .build();
    }

    const isMatch = await bcrypt.compare(oldPassword, dbUser.passwordHash);
    if (!isMatch) {
      logger.warn("Incorrect old password", { requestId, userId });
      return builder
        .status(401)
        .withError("Old password is incorrect", ERROR_CODES.INVALID_OLD_PASSWORD)
        .build();
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    logger.info("Password changed successfully", { requestId, userId });
    return builder
      .status(200)
      .build();
  } catch (error: any) {
    logger.error("Change password error", { requestId, error });
    return builder
      .status(500)
      .withError("Password change failed. Please try again later", ERROR_CODES.CHANGE_PASSWORD_ERROR)
      .build();
  }
};

/**
 * Send password reset OTP
 */
export const forgotPassword = async (requestId: string, data: any) => {
  const builder = new ResponseBuilder(requestId);

  try {
    const result = ForgotPasswordSchema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        issue: issue.message,
      }));
      logger.warn("Invalid forgot password input", { requestId, errors });
      return builder
        .status(400)
        .withError("Invalid input provided", ERROR_CODES.INVALID_INPUT, errors)
        .build();
    }

    const { email } = result.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success to prevent enumeration
      logger.info("No user found for OTP, returning success", { requestId, email });
      return builder
        .status(200)
        .build();
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcrypt.hash(otp, 10);

    // Delete any existing OTPs and create a new one
    await prisma.$transaction([
      prisma.otp.deleteMany({ where: { email } }),
      prisma.otp.create({
        data: {
          email,
          code: hashedOTP,
          expiresAt: new Date(Date.now() + 60 * 1000), // 1 minute
        },
      }),
    ]);

    // Send email if transporter is configured
    const transporter = getTransporter();
    if (transporter && env.EMAIL_USER) {
      await transporter.sendMail({
        from: env.EMAIL_USER,
        to: email,
        subject: "Password Reset OTP",
        text: `Your OTP is ${otp}. It expires in 1 minute.`,
      });
      logger.info("OTP email sent", { requestId, email });
    } else {
      logger.warn("Email not configured, OTP generated but not sent", {
        requestId,
        email,
        otp, // Log OTP in development for testing
      });
    }

    logger.info("OTP sent successfully", { requestId, email });
    return builder
      .status(200)
      .build();
  } catch (error: any) {
    logger.error("Forgot password error", { requestId, error });
    return builder
      .status(500)
      .withError("Failed to send OTP. Please try again later", ERROR_CODES.OTP_SEND_ERROR)
      .build();
  }
};

/**
 * Verify password reset OTP
 */
export const verifyOTP = async (requestId: string, data: any) => {
  const builder = new ResponseBuilder(requestId);

  try {
    const result = VerifyOtpSchema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        issue: issue.message,
      }));
      logger.warn("Invalid OTP verification input", { requestId, errors });
      return builder
        .status(400)
        .withError("Invalid input provided", ERROR_CODES.INVALID_INPUT, errors)
        .build();
    }

    const { email, otp } = result.data;

    await verifyOtp(email, otp);
    logger.info("OTP verified successfully", { requestId, email });
    return builder
      .status(200)
      .build();
  } catch (error: any) {
    logger.warn("OTP verification failed", { requestId, error: error.message });
    const errorMessage = error.message.includes("expired")
      ? "OTP has expired. Please request a new one"
      : "Invalid OTP. Please check and try again";

    return builder
      .status(400)
      .withError(
        errorMessage,
        error.message.includes("expired") ? ERROR_CODES.OTP_EXPIRED : ERROR_CODES.INVALID_OTP
      )
      .build();
  }
};

/**
 * Change password using OTP
 */
export const changeForgotPassword = async (requestId: string, data: any) => {
  const builder = new ResponseBuilder(requestId);

  try {
    const result = ChangeForgotPasswordSchema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        issue: issue.message,
      }));
      logger.warn("Invalid change forgot password input", { requestId, errors });
      return builder
        .status(400)
        .withError("Invalid input provided", ERROR_CODES.INVALID_INPUT, errors)
        .build();
    }

    const { email, otp, newPassword } = result.data;

    const storedOtp = await verifyOtp(email, otp);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { passwordHash: hashedPassword },
    });

    await prisma.otp.delete({ where: { id: storedOtp.id } });

    logger.info("Password changed successfully via OTP", { requestId, email });
    return builder
      .status(200)
      .build();
  } catch (error: any) {
    logger.warn("Change forgot password error", { requestId, error: error.message });
    const statusCode = error.message.includes("expired") || error.message.includes("OTP") ? 400 : 500;
    const errorMessage = error.message.includes("expired")
      ? "OTP has expired. Please request a new one"
      : error.message.includes("OTP")
      ? "Invalid OTP. Please check and try again"
      : "Password reset failed. Please try again later";

    return builder
      .status(statusCode)
      .withError(
        errorMessage,
        error.message.includes("expired")
          ? ERROR_CODES.OTP_EXPIRED
          : error.message.includes("OTP")
          ? ERROR_CODES.INVALID_OTP
          : ERROR_CODES.CHANGE_PASSWORD_ERROR
      )
      .build();
  }
};

