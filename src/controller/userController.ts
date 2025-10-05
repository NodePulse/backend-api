import { Request, Response } from "express";
import prisma from "../config/prisma.js";

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
