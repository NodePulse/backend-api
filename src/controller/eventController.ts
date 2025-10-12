import type { Request, Response } from "express";
import prisma from "../config/prisma.js";
import { uploadFileToR2 } from "./uploadController.js";
import { validationResult } from "express-validator";
import { Prisma } from "@prisma/client";
import { generateTransactionId } from "@/utils/commonFunction.js";

/**
 * @desc    Create a new event
 * @route   POST /api/events
 * @access  Private (requires user to be logged in)
 */
export const createEvent = async (req: Request, res: Response) => {
  // 1. Get the authenticated user's ID from the request object (set by your auth middleware)
  const organizerId = (req as any).user?.id;
  if (!organizerId) {
    // This case should ideally be handled by the auth middleware itself
    return res.status(401).json({ error: "User not authenticated." });
  }
  // console.log(req.files)

  // 2. Get the event details from the request body
  const {
    title,
    description,
    body,
    startDate,
    endDate,
    location,
    category,
    price,
    currency,
  } = req.body;
  const files = req.files;
  let imageUrl: string | undefined;
  let videoUrl: string | undefined;

  if (files) {
    const imageFile = (files as { [fieldname: string]: Express.Multer.File[] })[
      "image"
    ]?.[0];
    const videoFile = (files as { [fieldname: string]: Express.Multer.File[] })[
      "video"
    ]?.[0];

    if (imageFile) {
      imageUrl = await uploadFileToR2(imageFile);
      console.log("Image URL:", imageUrl);
    }

    if (videoFile) {
      videoUrl = await uploadFileToR2(videoFile);
      console.log("Video File:", videoUrl);
    }
  }

  // 3. Validate the required input fields
  if (
    !title ||
    !description ||
    !body ||
    !startDate ||
    !endDate ||
    !location ||
    !category ||
    !price ||
    !currency
  ) {
    return res.status(400).json({
      error:
        "Title, description, body, date, and location are required fields.",
    });
  }

  try {
    // 4. Create the new event in the database and link it to the organizer
    const newEvent = await prisma.event.create({
      data: {
        title,
        description,
        body,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        category,
        price,
        currency,
        imageUrl: imageUrl,
        videoUrl: videoUrl, // This is optional as defined in our schema
        organizerId: organizerId,
      },
      // Select the fields you want to return to the client
      select: {
        id: true,
        title: true,
        body: true,
        startDate: true,
        endDate: true,
        location: true,
        category: true,
        price: true,
        currency: true,
        imageUrl: true,
        videoUrl: true,
        organizer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // // 5. Send a success response with the newly created event data
    return res
      .status(201)
      .json({ message: "Event created successfully", newEvent });
  } catch (error) {
    // Handle potential errors, e.g., database connection issues
    console.error("Error creating event:", error);
    return res.status(500).json({ error: "Failed to create event." });
  }
};

export const getMyEvents = async (req: Request, res: Response) => {
  const organizerId = (req as any).user?.id;

  if (!organizerId) {
    res.status(401).json({ error: "User not authenticated." });
    return;
  }

  try {
    const events = await prisma.event.findMany({
      where: { organizerId },
      select: {
        id: true,
        title: true,
        description: true,
        body: true,
        startDate: true,
        endDate: true,
        location: true,
        category: true,
        price: true,
        currency: true,
        imageUrl: true,
        videoUrl: true,
        organizer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).json({ error: "Failed to fetch events." });
  }
};

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10", search, status } = req.query;

    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit as string, 10) || 10, 1);
    const offset = (pageNum - 1) * limitNum;

    const now = new Date();
    const andConditions: Prisma.EventWhereInput[] = [];

    // Search filter
    if (search) {
      andConditions.push({
        // OR: [
        //   { title: { contains: search as string, mode: "insensitive" } },
        //   { description: { contains: search as string, mode: "insensitive" } },
        // ],
        title: { contains: search as string, mode: "insensitive" },
      });
    }

    // Status filter
    if (status) {
      if (status === "upcoming") {
        andConditions.push({ startDate: { gt: now } });
      } else if (status === "ongoing") {
        andConditions.push({ startDate: { lte: now }, endDate: { gte: now } });
      } else if (status === "completed") {
        andConditions.push({ endDate: { lt: now } });
      }
    }

    // ✅ No user filter here → returns all users’ events
    const whereClause: Prisma.EventWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const [events, totalItems] = await prisma.$transaction([
      prisma.event.findMany({
        where: whereClause,
        skip: offset,
        take: limitNum,
        orderBy: { startDate: "asc" },
        include: {
          organizer: {
            select: { id: true, name: true, email: true }, // show who created it
          },
        },
      }),
      prisma.event.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      success: true,
      data: events,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum),
        currentPage: pageNum,
        pageSize: limitNum,
      },
    });
  } catch (error) {
    console.error("❌ Failed to fetch events:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  // 1. Validate the incoming request parameter
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // 2. Extract the ID from the URL
  const { id } = req.params;

  try {
    // 3. Find the event using its unique ID
    const event = await prisma.event.findUnique({
      where: {
        id: id,
      },
      // Optionally, include related data if you have relations
      include: {
        organizer: true,
        // category: true,
      },
    });

    // 4. Handle the case where the event is not found
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // 5. Send the successful response
    return res.status(200).json(event);
  } catch (error) {
    console.error("Failed to fetch event:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const checkEventRegistration = async (req: Request, res: Response) => {
  const eventId = req.params.id;
  const userId = (req as any).user?.id; // Assumes user ID is attached by auth middleware

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated." });
  }

  if (!eventId) {
    return res.status(400).json({ error: "Event ID is required." });
  }

  try {
    // 1. Fetch the event to check who the organizer is
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // 2. Check if the current user is the organizer
    if (event.organizerId === userId) {
      return res.status(200).json({
        registered: true,
        isOrganizer: true,
        message: "You are the organizer of this event.",
      });
    }

    // 3. If not the organizer, check the Attendee table like before
    const existingRegistration = await prisma.attendee.findFirst({
      where: {
        eventId: eventId,
        userId: userId,
      },
    });

    if (existingRegistration) {
      return res.status(200).json({
        registered: true,
        isOrganizer: false,
        message: "You are registered for this event.",
      });
    } else {
      return res.status(200).json({
        registered: false,
        isOrganizer: false,
        message: "You are not registered for this event.",
      });
    }
  } catch (error) {
    console.error("Error checking event registration:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ... (imports)

export const getEventAttendees = async (req: Request, res: Response) => {
  // 1. Validate incoming request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id: eventId } = req.params;
  const userId = (req as any).user?.id;
  const { page = "1", limit = "20" } = req.query;
  console.log(eventId);

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    // 2. Fetch the attendees for the event with pagination
    const attendees = await prisma.attendee.findMany({
      where: { eventId },
      take: limitNum,
      skip: offset,
      orderBy: {
        registeredAt: "desc", // Added for consistent ordering
      },
      include: {
        // 3. Include the user's public information
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // 4. Get the total count for pagination metadata
    const totalAttendees = await prisma.attendee.count({
      where: { eventId },
    });

    const totalPages = Math.ceil(totalAttendees / limitNum);

    const organizerId = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });
    const organizer = await prisma.user.findUnique({
      where: { id: organizerId?.organizerId },
      select: {
        id: true,
        name: true,
        image: true,
      },
    });

    // 5. Send the structured response
    return res.status(200).json({
      // --- FIX APPLIED HERE ---
      data: attendees
        .filter((attendee) => attendee.userId !== userId)
        .map((attendee) => attendee.user),
      me: attendees.find((attendee) => attendee.userId === userId)?.user,
      organizer,
      pagination: {
        totalItems: totalAttendees,
        totalPages,
        currentPage: pageNum,
        pageSize: limitNum,
      },
    });
  } catch (error) {
    console.error("Failed to fetch event attendees:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const eventRegister = async (req: Request, res: Response) => {
  const eventId = req.params.id;
  const userId = (req as any).user?.id;
  const { amount, currency, paymentMethod, cardNumber, upiId } = req.body;

  const last4 = cardNumber ? cardNumber.slice(-4) : null;

  if (!userId)
    return res.status(401).json({ error: "User not authenticated." });
  if (!eventId) return res.status(400).json({ error: "Event ID is required." });

  try {
    // 1. Find the event and check for existing registration
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { attendees: { where: { userId } } },
    });

    if (!event) return res.status(404).json({ error: "Event not found." });
    if (event.attendees.length > 0)
      return res.status(409).json({ error: "Already registered." });

    const isFreeEvent = !event.price || Number(event.price) <= 0;

    if (isFreeEvent) {
      console.log(amount, currency)
      // FREE event: register directly
      if (Number(amount) !== 0 || !currency) {
        return res
          .status(400)
          .json({ error: "Payment details are required for free events." });
      }

      const transactionId = generateTransactionId(eventId, userId);

      const payment = await prisma.payment.create({
        data: {
          amount,
          currency,
          status: "COMPLETED",
          transactionId,
          paymentGateway: "mock",
          userId,
          eventId,
          cardLast4: last4,
          method: "free", // "card" or "upi" etc.
          metadata: paymentMethod === "free" ? { userId: userId } : {},
        },
      });

      await prisma.$transaction(async (tx) => {
        await tx.attendee.create({ data: { userId, eventId } });
      });

      return res.status(200).json({
        message: "Registration successful.",
        paymentId: payment.id,
      });
    } else {
      // PAID event: payment required
      if (!amount || !currency || !paymentMethod) {
        return res
          .status(400)
          .json({ error: "Payment details are required for paid events." });
      }

      // Simulate payment success/failure randomly
      const paymentSuccess = Math.random() > 0.2; // 80% chance success, 20% fail

      const payment = await prisma.payment.create({
        data: {
          amount,
          currency,
          status: paymentSuccess ? "COMPLETED" : "FAILED",
          transactionId: "TXN_" + Math.random().toString(36).substring(2, 15),
          paymentGateway: "mock",
          userId,
          eventId,
          cardLast4: last4,
          method: paymentMethod, // "card" or "upi" etc.
          metadata:
            paymentMethod === "upi"
              ? { upiId }
              : paymentMethod === "card"
              ? { cardNumber }
              : {},
        },
      });

      if (!paymentSuccess) {
        return res.status(402).json({
          error: "Payment failed. Please try again.",
          paymentId: payment.id,
        });
      }

      // Register attendee in a transaction
      await prisma.$transaction(async (tx) => {
        await tx.attendee.create({ data: { userId, eventId } });
      });

      return res.status(200).json({
        message: "Registration and payment successful.",
        paymentId: payment.id,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};