import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createLogger, format, transports } from "winston";
import prisma from "../config/prisma.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { ResponseBuilder, type ServiceResponse } from "../utils/responseBuilder.js";

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
      .max(100, { message: "Title cannot exceed 100 characters" }),
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
    price: z.number().min(0, { message: "Price must be a positive number" }),
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
      .number()
      .int()
      .min(1, { message: "At least 1 attendee required" })
      .max(50, { message: "Maximum 50 attendees allowed" })
      .optional(),
    tags: z
      .string()
      .max(200, { message: "Tags cannot exceed 200 characters" })
      .optional(),
    eventUrl: z.string().url({ message: "Must be a valid URL" }).optional(),
    contactEmail: z.string().email({ message: "Invalid email address" }).optional(),
    contactPhone: z.string().optional(),
    requirements: z.string().max(500, { message: "Requirements cannot exceed 500 characters" }).optional(),
    refundPolicy: z.string().max(500, { message: "Refund policy cannot exceed 500 characters" }).optional(),
    ageRestriction: z
      .number()
      .int()
      .min(0, { message: "Age must be 0 or greater" })
      .max(99, { message: "Invalid age" })
      .optional(),
    registrationDeadline: z.string().datetime({ message: "Invalid deadline date format" }).optional(),
    allowWaitlist: z.boolean().optional(),
    sendReminders: z.boolean().optional(),
    allowGuestRegistration: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    imageUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional(),
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
  );

/**
 * Create a new event
 */
export const createEvent = async (
  requestId: string,
  data: any,
  headers?: Record<string, any>
): Promise<ServiceResponse> => {
  const builder = new ResponseBuilder(requestId);
  const userId = headers?.userId;

  if (!userId) {
    logger.warn("Create event attempted without authentication", { requestId });
    return builder
      .status(401)
      .withError("User not authenticated", ERROR_CODES.NOT_AUTHENTICATED)
      .build();
  }

  // Validate input
  const result = CreateEventSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      issue: issue.message,
    }));
    logger.warn("Invalid event creation input", { requestId, errors, userId });
    return builder
      .status(400)
      .withError("Invalid input provided", ERROR_CODES.INVALID_INPUT, errors)
      .build();
  }

  const validatedData = result.data;

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
        price: validatedData.price,
        currency: validatedData.currency,
        category: validatedData.category,
        eventType: eventTypeMap[validatedData.eventType],
        imageUrl: validatedData.imageUrl,
        videoUrl: validatedData.videoUrl,
        organizerId: userId,
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
    });

    logger.info("Event created successfully", {
      requestId,
      eventId: newEvent.id,
      userId,
    });

    return builder.status(201).withData(newEvent).build();
  } catch (error) {
    logger.error("Error creating event", { requestId, error });
    return builder
      .status(500)
      .withError("Failed to create event", ERROR_CODES.INTERNAL_SERVER_ERROR)
      .build();
  }
};

/**
 * Get events created by the user
 */
export const getMyEvents = async (
  requestId: string,
  data: any,
  headers?: Record<string, any>
): Promise<ServiceResponse> => {
  const builder = new ResponseBuilder(requestId);
  const userId = headers?.userId;

  if (!userId) {
    return builder
      .status(401)
      .withError("User not authenticated", ERROR_CODES.NOT_AUTHENTICATED)
      .build();
  }

  try {
    const events = await prisma.event.findMany({
      where: { organizerId: userId },
      orderBy: { createdAt: "desc" },
    });

    logger.info("User events fetched successfully", { requestId, userId });
    return builder.status(200).withData({ events }).build();
  } catch (error) {
    logger.error("Error fetching user events", { requestId, error });
    return builder
      .status(500)
      .withError("Failed to fetch events", ERROR_CODES.INTERNAL_SERVER_ERROR)
      .build();
  }
};

/**
 * Get all events with pagination and filters
 */
export const getAllEvents = async (
  requestId: string,
  data: any,
  headers?: Record<string, any>
): Promise<ServiceResponse> => {
  const builder = new ResponseBuilder(requestId);

  try {
    const { page = "1", limit = "10", search, status } = data || {};

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
      }),
      prisma.event.count({ where: whereClause }),
    ]);

    logger.info("All events fetched successfully", { requestId });
    return builder
      .status(200)
      .withData({
        events,
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / limitNum),
          currentPage: pageNum,
          pageSize: limitNum,
        },
      })
      .build();
  } catch (error) {
    logger.error("Failed to fetch all events", { requestId, error });
    return builder
      .status(500)
      .withError("Failed to fetch events", ERROR_CODES.INTERNAL_SERVER_ERROR)
      .build();
  }
};

/**
 * Get event by ID
 */
export const getEventById = async (
  requestId: string,
  data: any,
  headers?: Record<string, any>
): Promise<ServiceResponse> => {
  const builder = new ResponseBuilder(requestId);
  const { id } = data || {};

  if (!id) {
    return builder
      .status(400)
      .withError("Event ID is required", ERROR_CODES.INVALID_INPUT)
      .build();
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      logger.warn("Event not found", { requestId, eventId: id });
      return builder
        .status(404)
        .withError("Event not found", ERROR_CODES.EVENT_NOT_FOUND)
        .build();
    }

    logger.info("Event fetched successfully", { requestId, eventId: id });
    return builder.status(200).withData(event).build();
  } catch (error) {
    logger.error("Failed to fetch event", { requestId, error });
    return builder
      .status(500)
      .withError("Failed to fetch event", ERROR_CODES.INTERNAL_SERVER_ERROR)
      .build();
  }
};

/**
 * Check if user is registered for an event
 */
export const checkEventRegistration = async (
  requestId: string,
  data: any,
  headers?: Record<string, any>
): Promise<ServiceResponse> => {
  const builder = new ResponseBuilder(requestId);
  const userId = headers?.userId;
  const { eventId } = data || {};

  if (!userId) {
    return builder
      .status(401)
      .withError("User not authenticated", ERROR_CODES.NOT_AUTHENTICATED)
      .build();
  }

  if (!eventId) {
    return builder
      .status(400)
      .withError("Event ID is required", ERROR_CODES.INVALID_INPUT)
      .build();
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return builder
        .status(404)
        .withError("Event not found", ERROR_CODES.EVENT_NOT_FOUND)
        .build();
    }

    if (event.organizerId === userId) {
      return builder
        .status(200)
        .withData({
          registered: true,
          isOrganizer: true,
        })
        .build();
    }

    const existingRegistration = await prisma.attendee.findFirst({
      where: {
        eventId,
        userId,
      },
    });

    return builder
      .status(200)
      .withData({
        registered: !!existingRegistration,
        isOrganizer: false,
      })
      .build();
  } catch (error) {
    logger.error("Error checking event registration", { requestId, error });
    return builder
      .status(500)
      .withError("Failed to check registration", ERROR_CODES.INTERNAL_SERVER_ERROR)
      .build();
  }
};

/**
 * Register for an event
 */
export const eventRegister = async (
  requestId: string,
  data: any,
  headers?: Record<string, any>
): Promise<ServiceResponse> => {
  const builder = new ResponseBuilder(requestId);
  const userId = headers?.userId;
  const { eventId } = data || {};

  if (!userId) {
    return builder
      .status(401)
      .withError("User not authenticated", ERROR_CODES.NOT_AUTHENTICATED)
      .build();
  }

  if (!eventId) {
    return builder
      .status(400)
      .withError("Event ID is required", ERROR_CODES.INVALID_INPUT)
      .build();
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { attendees: { where: { userId } } },
    });

    if (!event) {
      return builder
        .status(404)
        .withError("Event not found", ERROR_CODES.EVENT_NOT_FOUND)
        .build();
    }

    if (event.attendees.length > 0) {
      return builder
        .status(409)
        .withError("Already registered for this event", ERROR_CODES.ALREADY_REGISTERED)
        .build();
    }

    // Check if event is full
    if (event.maxAttendees) {
      const currentAttendees = await prisma.attendee.count({
        where: { eventId },
      });
      if (currentAttendees >= event.maxAttendees) {
        return builder
          .status(400)
          .withError("Event is full", ERROR_CODES.EVENT_FULL)
          .build();
      }
    }

    // For free events, register directly
    if (!event.price || event.price <= 0) {
      await prisma.attendee.create({
        data: { userId, eventId },
      });

      logger.info("Event registration successful", { requestId, userId, eventId });
      return builder.status(200).withData({ message: "Registration successful" }).build();
    }

    // For paid events, return payment info (payment will be handled by transaction-service)
    return builder
      .status(200)
      .withData({
        message: "Payment required",
        price: event.price,
        currency: event.currency,
      })
      .build();
  } catch (error) {
    logger.error("Event registration error", { requestId, error });
    return builder
      .status(500)
      .withError("Event registration failed", ERROR_CODES.INTERNAL_SERVER_ERROR)
      .build();
  }
};

/**
 * Get event attendees
 */
export const getEventAttendees = async (
  requestId: string,
  data: any,
  headers?: Record<string, any>
): Promise<ServiceResponse> => {
  const builder = new ResponseBuilder(requestId);
  const { eventId, page = "1", limit = "20" } = data || {};

  if (!eventId) {
    return builder
      .status(400)
      .withError("Event ID is required", ERROR_CODES.INVALID_INPUT)
      .build();
  }

  try {
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    const [attendees, totalAttendees] = await prisma.$transaction([
      prisma.attendee.findMany({
        where: { eventId },
        take: limitNum,
        skip: offset,
        orderBy: { registeredAt: "desc" },
      }),
      prisma.attendee.count({ where: { eventId } }),
    ]);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });

    return builder
      .status(200)
      .withData({
        attendees,
        organizerId: event?.organizerId,
        pagination: {
          totalItems: totalAttendees,
          totalPages: Math.ceil(totalAttendees / limitNum),
          currentPage: pageNum,
          pageSize: limitNum,
        },
      })
      .build();
  } catch (error) {
    logger.error("Failed to fetch event attendees", { requestId, error });
    return builder
      .status(500)
      .withError("Failed to fetch attendees", ERROR_CODES.INTERNAL_SERVER_ERROR)
      .build();
  }
};

