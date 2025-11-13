// src/controller/userController.ts
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../shared/types/express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createLogger, format, transports } from "winston";
import prisma from "../config/prisma";
import { deleteFromS3, uploadFileToR2 } from "../../shared/utils/uploadUtils";
import { ResponseBuilder } from "../../shared/utils/responseHandler";
import { env } from "../../shared/config/env";
import { ERROR_CODES } from "../../shared/constants/errorCodes";

// Structured logger
const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

// Validation schemas
const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name cannot exceed 100 characters" })
    .optional(),
  phone: z
    .string()
    .min(10, { message: "Phone number must be at least 10 digits" })
    .max(15, { message: "Phone number cannot exceed 15 digits" })
    .regex(/^[0-9+\-() ]+$/, { message: "Invalid phone number format" })
    .optional(),
  bio: z
    .string()
    .max(500, { message: "Bio cannot exceed 500 characters" })
    .optional(),
  dateOfBirth: z
    .string()
    .datetime({ message: "Invalid date format" })
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .min(2, { message: "City must be at least 2 characters" })
    .max(100, { message: "City cannot exceed 100 characters" })
    .optional(),
  country: z
    .string()
    .min(2, { message: "Country must be at least 2 characters" })
    .max(100, { message: "Country cannot exceed 100 characters" })
    .optional(),
  company: z
    .string()
    .max(100, { message: "Company name cannot exceed 100 characters" })
    .optional(),
  jobTitle: z
    .string()
    .max(100, { message: "Job title cannot exceed 100 characters" })
    .optional(),
  website: z
    .string()
    .url({ message: "Invalid website URL" })
    .optional()
    .or(z.literal("")),
  linkedinUrl: z
    .string()
    .url({ message: "Invalid LinkedIn URL" })
    .optional()
    .or(z.literal("")),
  twitterUrl: z
    .string()
    .url({ message: "Invalid Twitter URL" })
    .optional()
    .or(z.literal("")),
  instagramUrl: z
    .string()
    .url({ message: "Invalid Instagram URL" })
    .optional()
    .or(z.literal("")),
  notificationsEnabled: z
    .boolean()
    .optional(),
});

const ChangePasswordSchema = z
  .object({
    oldPassword: z
      .string({ message: "Old password is required" })
      .min(8, {
        message: "Old password must be at least 8 characters long",
      })
      .max(20, {
        message: "Old password cannot exceed 20 characters",
      }),
    newPassword: z
      .string({ message: "New password is required" })
      .min(8, {
        message: "New password must be at least 8 characters long",
      })
      .max(20, {
        message: "New password cannot exceed 20 characters",
      })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message:
          "Password must contain at least one lowercase letter, one uppercase letter, and one digit",
      }),
    confirmPassword: z
      .string({ message: "Confirm password is required" })
      .min(8, {
        message: "Confirm password must be at least 8 characters long",
      })
      .max(20, { message: "Confirm password cannot exceed 20 characters" }),
  })
  .refine(
    (data: { newPassword: string; confirmPassword: string }) =>
      data.newPassword === data.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  )
  .refine(
    (data: { oldPassword: string; newPassword: string }) =>
      data.oldPassword !== data.newPassword,
    {
      message: "New password must be different from old password",
      path: ["newPassword"],
    }
  );

/**
 * Get authenticated user profile
 * @route GET /api/v1/users/profile
 */
export const getUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const user = req.user;

  if (!user) {
    logger.warn("Get user profile attempted without authentication", { requestId });
    return new ResponseBuilder(res)
      .status(401)
      .message("User not authenticated")
      .withErrorCode(ERROR_CODES.NOT_AUTHENTICATED)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        gender: true,
        image: true,
        role: true,
        phone: true,
        bio: true,
        dateOfBirth: true,
        city: true,
        country: true,
        company: true,
        jobTitle: true,
        website: true,
        linkedinUrl: true,
        twitterUrl: true,
        instagramUrl: true,
        isActive: true,
        lastLoginAt: true,
        notificationsEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!userProfile) {
      logger.warn("User not found", { requestId, userId: user.id });
      return new ResponseBuilder(res)
        .status(404)
        .message("User not found")
        .withErrorCode(ERROR_CODES.USER_NOT_FOUND)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    logger.info("User profile fetched successfully", { requestId, userId: user.id });
    return new ResponseBuilder(res)
      .status(200)
      .message("User profile retrieved successfully")
      .withData(userProfile)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Error fetching user profile", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to fetch user profile. Please try again later")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.INTERNAL_SERVER_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

/**
 * Get user registered events
 * @route GET /api/v1/users/events
 */
export const getUserEvents = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const user = req.user;

  if (!user) {
    logger.warn("Get user events attempted without authentication", { requestId });
    return new ResponseBuilder(res)
      .status(401)
      .message("User not authenticated")
      .withErrorCode(ERROR_CODES.NOT_AUTHENTICATED)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  try {
    const events = await prisma.attendee.findMany({
      where: { userId: user.id },
      include: {
        event: {
          include: {
            organizer: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: {
        registeredAt: "desc",
      },
    });

    const eventList = events.map((attendee) => attendee.event);

    logger.info("User events fetched successfully", { requestId, userId: user.id });
    return new ResponseBuilder(res)
      .status(200)
      .message("User events retrieved successfully")
      .withData(eventList)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Error fetching user events", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to fetch user events. Please try again later")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.INTERNAL_SERVER_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

/**
 * Get organized events by user
 * @route GET /api/v1/users/organized-events
 */
export const getOrganizedEvents = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const user = req.user;

  if (!user) {
    logger.warn("Get organized events attempted without authentication", { requestId });
    return new ResponseBuilder(res)
      .status(401)
      .message("User not authenticated")
      .withErrorCode(ERROR_CODES.NOT_AUTHENTICATED)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  try {
    const events = await prisma.event.findMany({
      where: { organizerId: user.id },
      include: {
        attendees: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });

    logger.info("Organized events fetched successfully", { requestId, userId: user.id });
    return new ResponseBuilder(res)
      .status(200)
      .message("Organized events retrieved successfully")
      .withData(events)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Error fetching organized events", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to fetch organized events. Please try again later")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.INTERNAL_SERVER_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

/**
 * Update user profile image
 * @route PUT /api/v1/users/profile-image
 */
export const updateProfileImage = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const user = req.user;

  if (!user) {
    logger.warn("Update profile image attempted without authentication", { requestId });
    return new ResponseBuilder(res)
      .status(401)
      .message("User not authenticated")
      .withErrorCode(ERROR_CODES.NOT_AUTHENTICATED)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  if (!req.files) {
    logger.warn("No image file provided", { requestId, userId: user.id });
    return new ResponseBuilder(res)
      .status(400)
      .message("No image file provided")
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  try {
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { image: true },
    });

    if (!userRecord) {
      logger.warn("User not found for profile image update", { requestId, userId: user.id });
      return new ResponseBuilder(res)
        .status(404)
        .message("User not found")
        .withErrorCode(ERROR_CODES.USER_NOT_FOUND)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    const oldImageUrl = userRecord.image;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const imageFile = files?.image?.[0];

    if (!imageFile) {
      logger.warn("Image file is missing from request", { requestId, userId: user.id });
      return new ResponseBuilder(res)
        .status(400)
        .message("Image file is missing")
        .withErrorCode(ERROR_CODES.INVALID_INPUT)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }
    
    const uploadResult = await uploadFileToR2(imageFile, "profiles");
    const newImageUrl = uploadResult;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { image: newImageUrl },
    });

    if (oldImageUrl) {
      await deleteFromS3(oldImageUrl)
        .then(() => {
          logger.info("Old image deleted successfully", { requestId, userId: user.id });
        })
        .catch((err) => {
          logger.error("Failed to delete old S3 object", { requestId, error: err });
        });
    }

    logger.info("Profile image updated successfully", { requestId, userId: user.id });
    return new ResponseBuilder(res)
      .status(200)
      .message("Profile image updated successfully")
      .withData(updatedUser)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Error updating profile image", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to update profile image. Please try again later")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.INTERNAL_SERVER_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

/**
 * Update user profile details
 * @route PUT /api/v1/users/profile
 */
export const updateUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const user = req.user;

  if (!user) {
    logger.warn("Update profile attempted without authentication", { requestId });
    return new ResponseBuilder(res)
      .status(401)
      .message("User not authenticated")
      .withErrorCode(ERROR_CODES.NOT_AUTHENTICATED)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  // Validate input
  const result = UpdateProfileSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue: z.ZodIssue) => ({
      field: issue.path.join("."),
      issue: issue.message,
    }));
    logger.warn("Invalid profile update input", { requestId, errors });
    return new ResponseBuilder(res)
      .status(400)
      .message("Invalid input provided")
      .withValidationErrors(errors)
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  const updateData = result.data;

  // Check if there's anything to update
  const hasUpdates = Object.keys(updateData).length > 0;
  if (!hasUpdates) {
    logger.warn("No fields to update", { requestId, userId: user.id });
    return new ResponseBuilder(res)
      .status(400)
      .message("No fields to update")
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  try {
    // Prepare data for update - convert empty strings to null for optional fields
    const dataToUpdate: any = {};
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.phone !== undefined) dataToUpdate.phone = updateData.phone || null;
    if (updateData.bio !== undefined) dataToUpdate.bio = updateData.bio || null;
    if (updateData.dateOfBirth !== undefined) {
      dataToUpdate.dateOfBirth = updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : null;
    }
    if (updateData.city !== undefined) dataToUpdate.city = updateData.city || null;
    if (updateData.country !== undefined) dataToUpdate.country = updateData.country || null;
    if (updateData.company !== undefined) dataToUpdate.company = updateData.company || null;
    if (updateData.jobTitle !== undefined) dataToUpdate.jobTitle = updateData.jobTitle || null;
    if (updateData.website !== undefined) dataToUpdate.website = updateData.website || null;
    if (updateData.linkedinUrl !== undefined) dataToUpdate.linkedinUrl = updateData.linkedinUrl || null;
    if (updateData.twitterUrl !== undefined) dataToUpdate.twitterUrl = updateData.twitterUrl || null;
    if (updateData.instagramUrl !== undefined) dataToUpdate.instagramUrl = updateData.instagramUrl || null;
    if (updateData.notificationsEnabled !== undefined) {
      dataToUpdate.notificationsEnabled = updateData.notificationsEnabled;
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        gender: true,
        image: true,
        role: true,
        phone: true,
        bio: true,
        dateOfBirth: true,
        city: true,
        country: true,
        company: true,
        jobTitle: true,
        website: true,
        linkedinUrl: true,
        twitterUrl: true,
        instagramUrl: true,
        isActive: true,
        lastLoginAt: true,
        notificationsEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info("User profile updated successfully", { requestId, userId: user.id });
    return new ResponseBuilder(res)
      .status(200)
      .message("Profile updated successfully")
      .withData(updatedUser)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Error updating user profile", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to update profile. Please try again later")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.INTERNAL_SERVER_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

/**
 * Change user password with encryption
 * @route POST /api/v1/users/change-password
 */
export const changeUserPassword = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const user = req.user;

  if (!user) {
    logger.warn("Change password attempted without authentication", { requestId });
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
    const errors = result.error.issues.map((issue: z.ZodIssue) => ({
      field: issue.path.join("."),
      issue: issue.message,
    }));
    logger.warn("Invalid change password input", { requestId, errors });
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
    // Get user with password hash
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!dbUser || !dbUser.passwordHash) {
      logger.warn("User not found for password change", { requestId, userId: user.id });
      return new ResponseBuilder(res)
        .status(404)
        .message("User not found")
        .withErrorCode(ERROR_CODES.USER_NOT_FOUND)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    // Verify old password with bcrypt
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

    // Hash new password with bcrypt (salt rounds: 10)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    logger.info("Password changed successfully", { requestId, userId: user.id });
    return new ResponseBuilder(res)
      .status(200)
      .message("Password changed successfully")
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Change password error", { requestId, error });
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
