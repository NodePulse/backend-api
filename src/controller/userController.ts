import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import { deleteFromS3, uploadFileToR2 } from "./uploadController.js";

/**
 * @desc    Get authenticated user's profile
 * @route   GET /api/users/me
 * @access  Private
 */
export const getUserProfile = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ error: "User not authenticated." });
  }

  try {
    const user = await prisma.user.findUnique({
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

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * @desc    Get events the user has joined or will attend
 * @route   GET /api/users/me/events
 * @access  Private
 */
export const getUserEvents = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ error: "User not authenticated." });
  }

  try {
    const events = await prisma.attendee.findMany({
      where: { userId },
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

    // Extract event details
    const eventList = events.map((attendee) => attendee.event);

    return res.status(200).json(eventList);
  } catch (error) {
    console.error("Error fetching user events:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * @desc    Get events the user has organized
 * @route   GET /api/users/me/organized-events
 * @access  Private
 */
export const getOrganizedEvents = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ error: "User not authenticated." });
  }

  try {
    const events = await prisma.event.findMany({
      where: { organizerId: userId },
      include: {
        attendees: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });

    return res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching organized events:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const updateProfileImage = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!req.files) {
    return res.status(400).json({ message: "No image file provided." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const oldImageUrl = user.image;

    // 3. Upload the new image to S3
    const uploadResult = await uploadFileToR2(req.files.image[0]);
    const newImageUrl = uploadResult; // The public URL of the uploaded image

    // 4. Update the user's record in the database with the new URL
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { image: newImageUrl },
    });

    // 5. Delete the old image from S3 (after successful DB update)
    console.log("Old image URL before deletion:", oldImageUrl);
    if (oldImageUrl) {
      await deleteFromS3(oldImageUrl).then(() => {
        console.log("Old image deleted successfully.");
      }).catch((err) => {
        // Log the error but don't fail the request, as the main goal (upload) succeeded
        console.error("Failed to delete old S3 object:", err);
      });
    }

    // 6. Send the successful response
    return res.status(200).json({
      message: "Profile image updated successfully.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};
