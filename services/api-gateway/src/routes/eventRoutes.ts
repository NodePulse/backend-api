import { Router, type Request, type Response } from "express";
import crypto from "crypto";
// @ts-ignore - multer types issue with ES modules
import multer from "multer";
import { rabbitMQService } from "../services/rabbitmq.js";
import { extractToken, type AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { ResponseBuilder } from "../utils/responseBuilder.js";
import { uploadFileToR2 } from "../utils/uploadUtils.js";
import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const eventRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Apply token extraction middleware
eventRouter.use(extractToken);

/**
 * POST /api/v1/events/create
 * Create a new event
 * Supports both:
 * - JSON with pre-uploaded URLs: { title, description, imageUrl, videoUrl, ... }
 * - formData with files: { image, video, title, description, ... }
 */
eventRouter.post(
  "/create",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (req: AuthenticatedRequest, res: Response) => {
    const requestId = crypto.randomUUID();
    const builder = new ResponseBuilder(requestId);

    try {
      if (!req.user) {
        builder
          .status(401)
          .withMessage("Not authenticated")
          .withError("Not authenticated")
          .withRequestContext({ method: req.method, url: req.originalUrl });
        return res.status(401).json(builder.build());
      }

      let eventData: any = { ...req.body };
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      // Handle file uploads if files are present
      if (files) {
        const imageFile = files["image"]?.[0];
        const videoFile = files["video"]?.[0];

        // Upload image if provided
        if (imageFile) {
          try {
            const imageUrl = await uploadFileToR2(
              imageFile.buffer,
              imageFile.mimetype,
              imageFile.originalname,
              "events"
            );
            eventData.imageUrl = imageUrl;
            logger.info("Image uploaded successfully", { requestId, url: imageUrl });
          } catch (error: any) {
            logger.error("Error uploading image", { requestId, error });
            // Continue without image if upload fails (optional: return error)
          }
        }

        // Upload video if provided
        if (videoFile) {
          try {
            const videoUrl = await uploadFileToR2(
              videoFile.buffer,
              videoFile.mimetype,
              videoFile.originalname,
              "events"
            );
            eventData.videoUrl = videoUrl;
            logger.info("Video uploaded successfully", { requestId, url: videoUrl });
          } catch (error: any) {
            logger.error("Error uploading video", { requestId, error });
            // Continue without video if upload fails (optional: return error)
          }
        }
      }

      // Parse string fields that might be sent as strings in formData
      if (typeof eventData.price === "string") {
        eventData.price = parseFloat(eventData.price);
      }
      if (typeof eventData.maxAttendees === "string") {
        eventData.maxAttendees = parseInt(eventData.maxAttendees, 10);
      }
      if (typeof eventData.ageRestriction === "string") {
        eventData.ageRestriction = parseInt(eventData.ageRestriction, 10);
      }
      if (typeof eventData.allowWaitlist === "string") {
        eventData.allowWaitlist = eventData.allowWaitlist === "true";
      }
      if (typeof eventData.sendReminders === "string") {
        eventData.sendReminders = eventData.sendReminders !== "false";
      }
      if (typeof eventData.allowGuestRegistration === "string") {
        eventData.allowGuestRegistration = eventData.allowGuestRegistration === "true";
      }
      if (typeof eventData.isPublished === "string") {
        eventData.isPublished = eventData.isPublished !== "false";
      }

      // Create event with event data (now includes imageUrl and videoUrl if files were uploaded)
      const response = await rabbitMQService.sendMessage(
        "event",
        "createEvent",
        eventData,
        { userId: req.user.id }
      );

      builder
        .status(response.statusCode)
        .withMessage(response.success ? "Event created successfully" : response.error?.message || "Failed to create event")
        .withData(response.data)
        .withRequestContext({ method: req.method, url: req.originalUrl });

      if (response.error) {
        builder.withError(response.error.message, response.error.code, response.error.details);
      }

      res.status(response.statusCode).json(builder.build());
    } catch (error: any) {
      logger.error("Error in create event route", { error, requestId });
      builder
        .status(500)
        .withMessage("Internal server error")
        .withError(error.message)
        .withRequestContext({ method: req.method, url: req.originalUrl });
      res.status(500).json(builder.build());
    }
  }
);

/**
 * GET /api/v1/events/get
 * Get events created by the user
 */
eventRouter.get("/get", async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    if (!req.user) {
      builder
        .status(401)
        .withMessage("Not authenticated")
        .withError("Not authenticated")
        .withRequestContext({ method: req.method, url: req.originalUrl });
      return res.status(401).json(builder.build());
    }

    const response = await rabbitMQService.sendMessage(
      "event",
      "getMyEvents",
      {},
      { userId: req.user.id }
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "Events retrieved successfully" : response.error?.message || "Failed to retrieve events")
      .withData(response.data)
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in get my events route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * GET /api/v1/events/all
 * Get all events with pagination and filters
 */
eventRouter.get("/all", async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    const response = await rabbitMQService.sendMessage(
      "event",
      "getAllEvents",
      req.query
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "Events retrieved successfully" : response.error?.message || "Failed to retrieve events")
      .withData(response.data)
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in get all events route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * GET /api/v1/events/:id
 * Get event by ID
 */
eventRouter.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    const response = await rabbitMQService.sendMessage(
      "event",
      "getEventById",
      { id: req.params.id }
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "Event retrieved successfully" : response.error?.message || "Failed to retrieve event")
      .withData(response.data)
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in get event by id route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * POST /api/v1/events/:id/register
 * Register for an event
 */
eventRouter.post("/:id/register", async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    if (!req.user) {
      builder
        .status(401)
        .withMessage("Not authenticated")
        .withError("Not authenticated")
        .withRequestContext({ method: req.method, url: req.originalUrl });
      return res.status(401).json(builder.build());
    }

    const response = await rabbitMQService.sendMessage(
      "event",
      "eventRegister",
      { eventId: req.params.id, ...req.body },
      { userId: req.user.id }
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "Registration successful" : response.error?.message || "Failed to register")
      .withData(response.data)
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in event register route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * GET /api/v1/events/:id/registered
 * Check if user is registered for an event
 */
eventRouter.get("/:id/registered", async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    if (!req.user) {
      builder
        .status(401)
        .withMessage("Not authenticated")
        .withError("Not authenticated")
        .withRequestContext({ method: req.method, url: req.originalUrl });
      return res.status(401).json(builder.build());
    }

    const response = await rabbitMQService.sendMessage(
      "event",
      "checkEventRegistration",
      { eventId: req.params.id },
      { userId: req.user.id }
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "Registration status retrieved" : response.error?.message || "Failed to check registration")
      .withData(response.data)
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in check event registration route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * GET /api/v1/events/:id/attendees
 * Get event attendees
 */
eventRouter.get("/:id/attendees", async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    const response = await rabbitMQService.sendMessage(
      "event",
      "getEventAttendees",
      { eventId: req.params.id, ...req.query }
    );

    builder
      .status(response.statusCode)
      .withMessage(response.success ? "Attendees retrieved successfully" : response.error?.message || "Failed to retrieve attendees")
      .withData(response.data)
      .withRequestContext({ method: req.method, url: req.originalUrl });

    if (response.error) {
      builder.withError(response.error.message, response.error.code, response.error.details);
    }

    res.status(response.statusCode).json(builder.build());
  } catch (error: any) {
    logger.error("Error in get event attendees route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

export default eventRouter;

