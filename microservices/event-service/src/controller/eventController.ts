import type { Response } from "express";
import type { AuthenticatedRequest } from "../../shared/types/express";
import { createLogger, format, transports } from "winston";
import { z } from "zod";
import prisma from "../config/prisma";
import { uploadFileToR2 } from "../../shared/utils/uploadUtils.js";
import { validationResult } from "express-validator";
import { Prisma } from "@prisma/client";
import { generateTransactionId } from "../../shared/utils/commonFunction.js";
import { razorpay } from "../../shared/config/razorpay.js";
import { ResponseBuilder } from "../../shared/utils/responseHandler";
import { env } from "../../shared/config/env";
import { ERROR_CODES } from "../../shared/constants/errorCodes";

// Structured logger
const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

// Validation schema for creating events
const CreateEventSchema = z
  .object({
    title: z
      .string()
      .min(5, { message: "Title must be at least 5 characters" })
      .max(100, { message: "Title cannot exceed 100 characters" })
      .regex(/^[a-zA-Z0-9\s\-_:!&(),.'"]+$/, {
        message: "Title contains invalid characters",
      }),
    description: z
      .string()
      .min(20, { message: "Description must be at least 20 characters" })
      .max(500, { message: "Description cannot exceed 500 characters" }),
    body: z
      .string()
      .min(50, { message: "Event details must be at least 50 characters" }),
    location: z
      .string()
      .min(3, { message: "Location must be at least 3 characters" })
      .max(200, { message: "Location cannot exceed 200 characters" }),
    startDate: z.string().datetime({ message: "Invalid start date format" }),
    endDate: z.string().datetime({ message: "Invalid end date format" }),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: "Invalid time format (HH:MM)",
      }),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: "Invalid time format (HH:MM)",
      }),
    price: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(z.number().min(0, { message: "Price must be a positive number" })),
    currency: z.enum(
      ["USD", "EUR", "INR", "GBP", "AUD", "CAD", "JPY", "CNY", "CHF", "SGD"],
      {
        message: "Invalid currency code",
      }
    ),
    category: z.enum(
      [
        "Music",
        "Sports",
        "Technology",
        "Art",
        "Fashion",
        "Food",
        "Travel",
        "Health",
        "Education",
        "Business",
        "Photography",
        "Cultural",
        "Gaming",
        "Entertainment",
        "Environment",
        "Networking",
      ],
      {
        message: "Invalid category",
      }
    ),
    eventType: z.enum(["offline", "online", "hybrid"], {
      message: "Event type must be offline, online, or hybrid",
    }),
    maxAttendees: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(
        z
          .number()
          .int()
          .min(1, { message: "At least 1 attendee required" })
          .max(50, { message: "Maximum 50 attendees allowed" })
          .optional()
      ),
    tags: z
      .string()
      .max(200, { message: "Tags cannot exceed 200 characters" })
      .regex(/^[a-zA-Z0-9,\s-]*$/, {
        message: "Tags can only contain letters, numbers, commas, spaces, and hyphens",
      })
      .optional(),
    eventUrl: z
      .string()
      .url({ message: "Must be a valid URL (e.g., https://example.com)" })
      .max(500, { message: "URL is too long" })
      .optional(),
    contactEmail: z
      .string()
      .email({ message: "Invalid email address" })
      .max(100, { message: "Email is too long" })
      .optional(),
    contactPhone: z
      .string()
      .min(10, { message: "Phone number must be at least 10 digits" })
      .max(20, { message: "Phone number is too long" })
      .regex(/^[0-9+\-() ]+$/, { message: "Invalid phone number format" })
      .optional(),
    requirements: z
      .string()
      .max(500, { message: "Requirements cannot exceed 500 characters" })
      .optional(),
    refundPolicy: z
      .string()
      .max(500, { message: "Refund policy cannot exceed 500 characters" })
      .optional(),
    ageRestriction: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(
        z
          .number()
          .int()
          .min(0, { message: "Age must be 0 or greater" })
          .max(99, { message: "Invalid age" })
          .optional()
      ),
    registrationDeadline: z
      .string()
      .datetime({ message: "Invalid deadline date format" })
      .optional(),
    allowWaitlist: z
      .string()
      .optional()
      .transform((val) => val === "true"),
    sendReminders: z
      .string()
      .optional()
      .transform((val) => val !== "false"),
    allowGuestRegistration: z
      .string()
      .optional()
      .transform((val) => val === "true"),
    isPublished: z
      .string()
      .optional()
      .transform((val) => val !== "false"),
  })
  .refine(
    (data) => {
      const startDate = new Date(data.startDate);
      const now = new Date();
      return startDate > now;
    },
    {
      message: "Event cannot be in the past",
      path: ["startDate"],
    }
  )
  .refine(
    (data) => {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      return endDate > startDate;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      if (!data.registrationDeadline) return true;
      const deadline = new Date(data.registrationDeadline);
      const startDate = new Date(data.startDate);
      const now = new Date();
      return deadline > now && deadline < startDate;
    },
    {
      message: "Deadline cannot be in the past and must be before event starts",
      path: ["registrationDeadline"],
    }
  );

/**
 * @desc    Create a new event
 * @route   POST /api/v1/events/create
 * @access  Private (requires user to be logged in)
 */
export const createEvent = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const user = req.user;

  if (!user) {
    logger.warn("Create event attempted without authentication", { requestId });
    return new ResponseBuilder(res)
      .status(401)
      .message("User not authenticated")
      .withErrorCode(ERROR_CODES.NOT_AUTHENTICATED)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  // Validate input using Zod schema
  const result = CreateEventSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue: z.ZodIssue) => ({
      field: issue.path.join("."),
      issue: issue.message,
    }));
    logger.warn("Invalid event creation input", { requestId, errors, userId: user.id });
    return new ResponseBuilder(res)
      .status(400)
      .message("Invalid input provided")
      .withValidationErrors(errors)
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  const validatedData = result.data;

  // Validate file uploads
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

    // Validate image file
    if (imageFile) {
      const maxImageSize = 10 * 1024 * 1024; // 10 MB
      if (imageFile.size > maxImageSize) {
        logger.warn("Image file too large", { requestId, size: imageFile.size });
        return new ResponseBuilder(res)
          .status(400)
          .message("File size must be less than 10MB")
          .withErrorCode(ERROR_CODES.INVALID_INPUT)
          .withRequestId(requestId)
          .withLogging(env.NODE_ENV !== "production")
          .send();
      }

      const allowedImageFormats = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
      const fileExt = imageFile.originalname
        .toLowerCase()
        .substring(imageFile.originalname.lastIndexOf("."));
      if (!allowedImageFormats.includes(fileExt)) {
        logger.warn("Invalid image format", { requestId, format: fileExt });
        return new ResponseBuilder(res)
          .status(400)
          .message("Image must be PNG, JPG, GIF, or WebP format")
          .withErrorCode(ERROR_CODES.INVALID_INPUT)
          .withRequestId(requestId)
          .withLogging(env.NODE_ENV !== "production")
          .send();
      }

      imageUrl = await uploadFileToR2(imageFile, "events");
      logger.info("Image uploaded", { requestId, imageUrl });
    }

    // Validate video file
    if (videoFile) {
      const maxVideoSize = 50 * 1024 * 1024; // 50 MB
      if (videoFile.size > maxVideoSize) {
        logger.warn("Video file too large", { requestId, size: videoFile.size });
        return new ResponseBuilder(res)
          .status(400)
          .message("File size must be less than 50MB")
          .withErrorCode(ERROR_CODES.INVALID_INPUT)
          .withRequestId(requestId)
          .withLogging(env.NODE_ENV !== "production")
          .send();
      }

      const allowedVideoFormats = [".mp4", ".mov", ".avi", ".webm"];
      const fileExt = videoFile.originalname
        .toLowerCase()
        .substring(videoFile.originalname.lastIndexOf("."));
      if (!allowedVideoFormats.includes(fileExt)) {
        logger.warn("Invalid video format", { requestId, format: fileExt });
        return new ResponseBuilder(res)
          .status(400)
          .message("Video must be MP4, MOV, AVI, or WebM format")
          .withErrorCode(ERROR_CODES.INVALID_INPUT)
          .withRequestId(requestId)
          .withLogging(env.NODE_ENV !== "production")
          .send();
      }

      videoUrl = await uploadFileToR2(videoFile, "events");
      logger.info("Video uploaded", { requestId, videoUrl });
    }
  }

  try {
    // Map eventType from lowercase to uppercase enum
    const eventTypeMap: Record<string, "OFFLINE" | "ONLINE" | "HYBRID"> = {
      offline: "OFFLINE",
      online: "ONLINE",
      hybrid: "HYBRID",
    };

    const newEvent = await prisma.event.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        body: validatedData.body,
        location: validatedData.location,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        price: validatedData.price as number,
        currency: validatedData.currency,
        category: validatedData.category,
        eventType: eventTypeMap[validatedData.eventType],
        imageUrl: imageUrl,
        videoUrl: videoUrl,
        organizerId: user.id,
        maxAttendees: validatedData.maxAttendees,
        tags: validatedData.tags,
        eventUrl: validatedData.eventUrl,
        contactEmail: validatedData.contactEmail,
        contactPhone: validatedData.contactPhone,
        requirements: validatedData.requirements,
        refundPolicy: validatedData.refundPolicy,
        ageRestriction: validatedData.ageRestriction,
        registrationDeadline: validatedData.registrationDeadline
          ? new Date(validatedData.registrationDeadline)
          : null,
        allowWaitlist: validatedData.allowWaitlist || false,
        sendReminders: validatedData.sendReminders !== false,
        allowGuestRegistration: validatedData.allowGuestRegistration || false,
        isPublished: validatedData.isPublished !== false,
      },
      select: {
        id: true,
        title: true,
        description: true,
        body: true,
        location: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        price: true,
        currency: true,
        category: true,
        eventType: true,
        imageUrl: true,
        videoUrl: true,
        maxAttendees: true,
        tags: true,
        eventUrl: true,
        contactEmail: true,
        contactPhone: true,
        requirements: true,
        refundPolicy: true,
        ageRestriction: true,
        registrationDeadline: true,
        allowWaitlist: true,
        sendReminders: true,
        allowGuestRegistration: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    logger.info("Event created successfully", {
      requestId,
      eventId: newEvent.id,
      userId: user.id,
    });
    return new ResponseBuilder(res)
      .status(201)
      .message("Event created successfully")
      .withData(newEvent)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Error creating event", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to create event. Please try again later")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.INTERNAL_SERVER_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

export const getMyEvents = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const user = req.user;

  if (!user) {
    logger.warn("Get my events attempted without authentication", { requestId });
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

    logger.info("My events fetched successfully", { requestId, userId: user.id });
    return new ResponseBuilder(res)
      .status(200)
      .message("Events retrieved successfully")
      .withData(events)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Error fetching my events", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to fetch events. Please try again later")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.INTERNAL_SERVER_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

export const getAllEvents = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();

  try {
    const { page = "1", limit = "10", search, status } = req.query;

    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit as string, 10) || 10, 1);
    const offset = (pageNum - 1) * limitNum;

    const now = new Date();
    const andConditions: Prisma.EventWhereInput[] = [];

    if (search) {
      andConditions.push({
        title: { contains: search as string, mode: "insensitive" },
      });
    }

    if (status) {
      if (status === "upcoming") {
        andConditions.push({ startDate: { gt: now } });
      } else if (status === "ongoing") {
        andConditions.push({ startDate: { lte: now }, endDate: { gte: now } });
      } else if (status === "completed") {
        andConditions.push({ endDate: { lt: now } });
      }
    }

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
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.event.count({ where: whereClause }),
    ]);

    logger.info("All events fetched successfully", { requestId });
    return new ResponseBuilder(res)
      .status(200)
      .message("Events retrieved successfully")
      .withData({
        events,
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / limitNum),
          currentPage: pageNum,
          pageSize: limitNum,
        },
      })
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Failed to fetch all events", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to fetch events. Please try again later")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.INTERNAL_SERVER_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

export const getEventById = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.warn("Invalid event ID validation", { requestId, errors: errors.array() });
    return new ResponseBuilder(res)
      .status(400)
      .message("Invalid input provided")
      .withValidationErrors(errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        issue: err.msg,
      })))
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  const { id } = req.params;

  try {
    const event = await prisma.event.findUnique({
      where: {
        id: id,
      },
      include: {
        organizer: true,
      },
    });

    if (!event) {
      logger.warn("Event not found", { requestId, eventId: id });
      return new ResponseBuilder(res)
        .status(404)
        .message("Event not found")
        .withErrorCode(ERROR_CODES.USER_NOT_FOUND)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    logger.info("Event fetched successfully", { requestId, eventId: id });
    return new ResponseBuilder(res)
      .status(200)
      .message("Event retrieved successfully")
      .withData(event)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Failed to fetch event", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to fetch event. Please try again later")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.INTERNAL_SERVER_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

export const checkEventRegistration = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const eventId = req.params.id;
  const user = req.user;

  if (!user) {
    logger.warn("Check event registration attempted without authentication", { requestId });
    return new ResponseBuilder(res)
      .status(401)
      .message("User not authenticated")
      .withErrorCode(ERROR_CODES.NOT_AUTHENTICATED)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  if (!eventId) {
    logger.warn("Missing event ID", { requestId, userId: user.id });
    return new ResponseBuilder(res)
      .status(400)
      .message("Event ID is required")
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      logger.warn("Event not found for registration check", { requestId, eventId });
      return new ResponseBuilder(res)
        .status(404)
        .message("Event not found")
        .withErrorCode(ERROR_CODES.USER_NOT_FOUND)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    if (event.organizerId === user.id) {
      logger.info("User is event organizer", { requestId, userId: user.id, eventId });
      return new ResponseBuilder(res)
        .status(200)
        .message("You are the organizer of this event")
        .withData({
          registered: true,
          isOrganizer: true,
        })
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    const existingRegistration = await prisma.attendee.findFirst({
      where: {
        eventId: eventId,
        userId: user.id,
      },
    });

    if (existingRegistration) {
      logger.info("User is registered for event", { requestId, userId: user.id, eventId });
      return new ResponseBuilder(res)
        .status(200)
        .message("You are registered for this event")
        .withData({
          registered: true,
          isOrganizer: false,
        })
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    } else {
      logger.info("User is not registered for event", { requestId, userId: user.id, eventId });
      return new ResponseBuilder(res)
        .status(200)
        .message("You are not registered for this event")
        .withData({
          registered: false,
          isOrganizer: false,
        })
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }
  } catch (error) {
    logger.error("Error checking event registration", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to check event registration. Please try again later")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.INTERNAL_SERVER_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

export const getEventAttendees = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.warn("Invalid attendees request validation", { requestId, errors: errors.array() });
    return new ResponseBuilder(res)
      .status(400)
      .message("Invalid input provided")
      .withValidationErrors(errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        issue: err.msg,
      })))
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  const { id: eventId } = req.params;
  const user = req.user;
  const { page = "1", limit = "20" } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    const attendees = await prisma.attendee.findMany({
      where: { eventId },
      take: limitNum,
      skip: offset,
      orderBy: {
        registeredAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

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

    logger.info("Event attendees fetched successfully", { requestId, eventId });
    return new ResponseBuilder(res)
      .status(200)
      .message("Event attendees retrieved successfully")
      .withData({
        data: attendees
          .filter((attendee) => attendee.userId !== user?.id)
          .map((attendee) => attendee.user),
        me: attendees.find((attendee) => attendee.userId === user?.id)?.user,
        organizer,
        pagination: {
          totalItems: totalAttendees,
          totalPages,
          currentPage: pageNum,
          pageSize: limitNum,
        },
      })
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Failed to fetch event attendees", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to fetch event attendees. Please try again later")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.INTERNAL_SERVER_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};

export const eventRegister = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const eventId = req.params.id;
  const user = req.user;
  const { amount, currency, paymentMethod, cardNumber, upiId } = req.body;

  const last4 = cardNumber ? cardNumber.slice(-4) : null;

  if (!user) {
    logger.warn("Event registration attempted without authentication", { requestId });
    return new ResponseBuilder(res)
      .status(401)
      .message("User not authenticated")
      .withErrorCode(ERROR_CODES.NOT_AUTHENTICATED)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  if (!eventId) {
    logger.warn("Missing event ID for registration", { requestId, userId: user.id });
    return new ResponseBuilder(res)
      .status(400)
      .message("Event ID is required")
      .withErrorCode(ERROR_CODES.INVALID_INPUT)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { attendees: { where: { userId: user.id } } },
    });

    if (!event) {
      logger.warn("Event not found for registration", { requestId, eventId });
      return new ResponseBuilder(res)
        .status(404)
        .message("Event not found")
        .withErrorCode(ERROR_CODES.USER_NOT_FOUND)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    if (event.attendees.length > 0) {
      logger.warn("User already registered for event", { requestId, userId: user.id, eventId });
      return new ResponseBuilder(res)
        .status(409)
        .message("Already registered for this event")
        .withErrorCode(ERROR_CODES.USER_EXISTS)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    const isFreeEvent = !event.price || Number(event.price) <= 0;

    if (isFreeEvent) {
      if (Number(amount) !== 0 || !currency) {
        logger.warn("Invalid payment details for free event", { requestId, userId: user.id, eventId });
        return new ResponseBuilder(res)
          .status(400)
          .message("Invalid payment details for free event")
          .withErrorCode(ERROR_CODES.INVALID_INPUT)
          .withRequestId(requestId)
          .withLogging(env.NODE_ENV !== "production")
          .send();
      }

      const transactionId = generateTransactionId(eventId, user.id);

      const payment = await prisma.payment.create({
        data: {
          amount,
          currency,
          status: "COMPLETED",
          transactionId,
          paymentGateway: "mock",
          userId: user.id,
          eventId,
          cardLast4: last4,
          method: "free",
          metadata: paymentMethod === "free" ? { userId: user.id } : {},
        },
      });

      await prisma.$transaction(async (tx) => {
        await tx.attendee.create({ data: { userId: user.id, eventId } });
      });

      logger.info("Free event registration successful", { requestId, userId: user.id, eventId, paymentId: payment.id });
      return new ResponseBuilder(res)
        .status(200)
        .message("Registration successful")
        .withData({
          paymentId: payment.id,
        })
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    } else {
      if (!amount || !currency || !paymentMethod) {
        logger.warn("Missing payment details for paid event", { requestId, userId: user.id, eventId });
        return new ResponseBuilder(res)
          .status(400)
          .message("Payment details are required for paid events")
          .withErrorCode(ERROR_CODES.INVALID_INPUT)
          .withRequestId(requestId)
          .withLogging(env.NODE_ENV !== "production")
          .send();
      }

      if (Number(amount) !== Number(event.price)) {
        logger.warn("Amount mismatch", { requestId, userId: user.id, eventId, provided: amount, expected: event.price });
        return new ResponseBuilder(res)
          .status(400)
          .message(`The provided amount (${amount}) does not match the event price (${event.price})`)
          .withErrorCode(ERROR_CODES.INVALID_INPUT)
          .withRequestId(requestId)
          .withLogging(env.NODE_ENV !== "production")
          .send();
      }

      const orderOptions = {
        amount: amount * 100,
        currency,
        receipt: `rcpt_${Date.now()}`,
        notes: {
          eventId,
          userId: user.id,
        },
      };

      const order = await razorpay.orders.create(orderOptions);

      const payment = await prisma.payment.create({
        data: {
          amount,
          currency,
          status: "PENDING",
          transactionId: order.id,
          paymentGateway: "razorpay",
          userId: user.id,
          eventId,
          cardLast4: last4,
          method: paymentMethod,
          metadata:
            paymentMethod === "upi"
              ? { upiId }
              : paymentMethod === "card"
              ? { cardNumber }
              : {},
        },
      });

      logger.info("Payment order created successfully", { requestId, userId: user.id, eventId, paymentId: payment.id });
      return new ResponseBuilder(res)
        .status(200)
        .message("Order created successfully. Proceed with payment")
        .withData({
          paymentId: payment.id,
          order,
        })
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }
  } catch (error) {
    logger.error("Event registration error", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Event registration failed. Please try again later")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.INTERNAL_SERVER_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};
