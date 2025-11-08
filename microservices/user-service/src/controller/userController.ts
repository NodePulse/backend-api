import { Request, Response } from "express";
import prisma from "../../shared/config/prisma.js";
import { deleteFromS3, uploadFileToR2 } from "../../shared/utils/uploadUtils.js";

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

    const eventList = events.map((attendee) => attendee.event);

    return res.status(200).json(eventList);
  } catch (error) {
    console.error("Error fetching user events:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

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

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const imageFile = files?.image?.[0];

    if (!imageFile) {
      return res.status(400).json({ message: "Image file is missing." });
    }
    
    const uploadResult = await uploadFileToR2(imageFile, "profiles");
    const newImageUrl = uploadResult;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { image: newImageUrl },
    });

    if (oldImageUrl) {
      await deleteFromS3(oldImageUrl).then(() => {
        console.log("Old image deleted successfully.");
      }).catch((err) => {
        console.error("Failed to delete old S3 object:", err);
      });
    }

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
