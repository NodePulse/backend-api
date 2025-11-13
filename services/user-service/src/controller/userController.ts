import bcrypt from "bcryptjs";
import { z } from "zod";
import { createLogger, format, transports } from "winston";
import prisma from "../config/prisma.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { uploadFileToR2, deleteFromS3 } from "../utils/uploadUtils.js";
import { ResponseBuilder } from "../utils/responseBuilder.js";

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
  notificationsEnabled: z.boolean().optional(),
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
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message:
          "Password must contain at least one lowercase letter, one uppercase letter, and one digit",
      }),
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
    message: "New password must be different from old password",
    path: ["newPassword"],
  });

/**
 * Get user profile
 */
export const getProfile = async (requestId: string, headers: any) => {
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
      logger.warn("User not found", { requestId, userId });
      return builder
        .status(404)
        .withError("User not found", ERROR_CODES.USER_NOT_FOUND)
        .build();
    }

    logger.info("User profile fetched successfully", { requestId, userId });
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
 * Update user profile
 */
export const updateProfile = async (requestId: string, data: any, headers: any) => {
  const builder = new ResponseBuilder(requestId);

  try {
    const userId = headers?.userId;
    if (!userId) {
      return builder
        .status(401)
        .withError("User not authenticated", ERROR_CODES.NOT_AUTHENTICATED)
        .build();
    }

    const result = UpdateProfileSchema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        issue: issue.message,
      }));
      logger.warn("Invalid profile update input", { requestId, errors });
      return builder
        .status(400)
        .withError("Invalid input provided", ERROR_CODES.INVALID_INPUT, errors)
        .build();
    }

    const updateData = result.data;
    const hasUpdates = Object.keys(updateData).length > 0;
    if (!hasUpdates) {
      logger.warn("No fields to update", { requestId, userId });
      return builder
        .status(400)
        .withError("No fields to update", ERROR_CODES.INVALID_INPUT)
        .build();
    }

    // Prepare data for update
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

    const updatedUser = await prisma.user.update({
      where: { id: userId },
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

    logger.info("User profile updated successfully", { requestId, userId });
    return builder
      .status(200)
      .withData(updatedUser)
      .build();
  } catch (error: any) {
    logger.error("Error updating user profile", { requestId, error });
    return builder
      .status(500)
      .withError("Failed to update profile. Please try again later", ERROR_CODES.INTERNAL_SERVER_ERROR)
      .build();
  }
};

/**
 * Update profile image
 */
export const updateProfileImage = async (requestId: string, data: any, headers: any) => {
  const builder = new ResponseBuilder(requestId);

  try {
    const userId = headers?.userId;
    if (!userId) {
      return builder
        .status(401)
        .withError("User not authenticated", ERROR_CODES.NOT_AUTHENTICATED)
        .build();
    }

    const fileData = data?.file;
    if (!fileData || !fileData.buffer) {
      logger.warn("No image file provided", { requestId, userId });
      return builder
        .status(400)
        .withError("No image file provided", ERROR_CODES.INVALID_INPUT)
        .build();
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    if (!userRecord) {
      logger.warn("User not found for profile image update", { requestId, userId });
      return builder
        .status(404)
        .withError("User not found", ERROR_CODES.USER_NOT_FOUND)
        .build();
    }

    const oldImageUrl = userRecord.image;

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileData.buffer, "base64");

    // Upload new image
    const newImageUrl = await uploadFileToR2(
      fileBuffer,
      fileData.mimetype,
      fileData.originalname,
      "profiles"
    );

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { image: newImageUrl },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Delete old image if exists
    if (oldImageUrl) {
      await deleteFromS3(oldImageUrl).catch((err) => {
        logger.error("Failed to delete old image", { requestId, error: err });
      });
    }

    logger.info("Profile image updated successfully", { requestId, userId });
    return builder
      .status(200)
      .withData(updatedUser)
      .build();
  } catch (error: any) {
    logger.error("Error updating profile image", { requestId, error });
    return builder
      .status(500)
      .withError("Failed to update profile image. Please try again later", ERROR_CODES.INTERNAL_SERVER_ERROR)
      .build();
  }
};

/**
 * Change user password
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

    // Note: Password hash should be fetched from auth-service
    // For now, we'll assume it's stored here too or we need to call auth-service
    // This is a design decision - you might want to keep password in auth-service only
    logger.warn("Password change requested but password hash not available in user-service", {
      requestId,
      userId,
    });

    return builder
      .status(400)
      .withError("Password change should be handled by auth-service", ERROR_CODES.INVALID_INPUT)
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
 * Get user events (placeholder - would need event-service integration)
 */
export const getUserEvents = async (requestId: string, headers: any) => {
  const builder = new ResponseBuilder(requestId);

  try {
    const userId = headers?.userId;
    if (!userId) {
      return builder
        .status(401)
        .withError("User not authenticated", ERROR_CODES.NOT_AUTHENTICATED)
        .build();
    }

    // This would require integration with event-service
    // For now, return empty array
    logger.info("User events fetched (placeholder)", { requestId, userId });
    return builder
      .status(200)
      .withData([])
      .build();
  } catch (error: any) {
    logger.error("Error fetching user events", { requestId, error });
    return builder
      .status(500)
      .withError("Failed to fetch user events. Please try again later", ERROR_CODES.INTERNAL_SERVER_ERROR)
      .build();
  }
};

/**
 * Get organized events (placeholder - would need event-service integration)
 */
export const getOrganizedEvents = async (requestId: string, headers: any) => {
  const builder = new ResponseBuilder(requestId);

  try {
    const userId = headers?.userId;
    if (!userId) {
      return builder
        .status(401)
        .withError("User not authenticated", ERROR_CODES.NOT_AUTHENTICATED)
        .build();
    }

    // This would require integration with event-service
    // For now, return empty array
    logger.info("Organized events fetched (placeholder)", { requestId, userId });
    return builder
      .status(200)
      .withData([])
      .build();
  } catch (error: any) {
    logger.error("Error fetching organized events", { requestId, error });
    return builder
      .status(500)
      .withError("Failed to fetch organized events. Please try again later", ERROR_CODES.INTERNAL_SERVER_ERROR)
      .build();
  }
};

