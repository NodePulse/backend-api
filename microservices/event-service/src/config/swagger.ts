import swaggerJsdoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Event Service API",
    version: "1.0.0",
    description: `
Event Service API for managing events, registrations, and attendees.

**Key Features:**
- Create and manage events with images and videos
- Event registration and attendee management
- Browse and search events
- Razorpay payment integration
- Role-based access control

**Authentication:**
All endpoints require JWT authentication via HTTP-only cookie.

**Response Format:**
All successful responses follow a standardized format with metadata and data payload.
    `.trim(),
    contact: {
      name: "API Support",
      email: "support@example.com",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:3003",
      description: "Development server",
    },
    {
      url: "https://api.example.com",
      description: "Production server",
    },
  ],
  tags: [
    {
      name: "Events",
      description: "Event management operations",
    },
    {
      name: "Registration",
      description: "Event registration and attendee operations",
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "token",
        description:
          "JWT token stored in an HTTP-only cookie. Automatically set on login/register. Valid for 24 hours.",
      },
    },
    schemas: {
      // Event Schema
      Event: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique event identifier (UUID)",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          title: {
            type: "string",
            description: "Event title",
            example: "Tech Conference 2024",
          },
          description: {
            type: "string",
            description: "Short event description",
            example: "Annual technology conference featuring industry leaders",
          },
          body: {
            type: "string",
            nullable: true,
            description: "Detailed event description (rich text/HTML)",
            example: "<p>Join us for an amazing conference...</p>",
          },
          image: {
            type: "string",
            format: "uri",
            nullable: true,
            description: "Event cover image URL",
            example: "https://cdn.example.com/events/tech-conf-2024.jpg",
          },
          video: {
            type: "string",
            format: "uri",
            nullable: true,
            description: "Event promotional video URL",
            example: "https://cdn.example.com/events/tech-conf-2024.mp4",
          },
          startDate: {
            type: "string",
            format: "date-time",
            description: "Event start date and time",
            example: "2024-06-15T09:00:00.000Z",
          },
          endDate: {
            type: "string",
            format: "date-time",
            description: "Event end date and time",
            example: "2024-06-15T18:00:00.000Z",
          },
          startTime: {
            type: "string",
            description: "Event start time (HH:MM format, 24-hour)",
            example: "09:00",
            pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$",
          },
          endTime: {
            type: "string",
            description: "Event end time (HH:MM format, 24-hour)",
            example: "17:00",
            pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$",
          },
          location: {
            type: "string",
            description: "Event location/venue",
            example: "San Francisco Convention Center",
          },
          category: {
            type: "string",
            enum: [
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
            description: "Event category",
            example: "Technology",
          },
          eventType: {
            type: "string",
            enum: ["offline", "online", "hybrid"],
            description: "Type of event",
            example: "offline",
          },
          price: {
            type: "number",
            description: "Event ticket price (0 for free events)",
            example: 25.99,
            minimum: 0,
          },
          currency: {
            type: "string",
            enum: ["USD", "EUR", "INR", "GBP", "AUD", "CAD", "JPY", "CNY", "CHF", "SGD"],
            description: "Currency code (ISO 4217)",
            example: "USD",
            default: "USD",
          },
          maxAttendees: {
            type: "integer",
            nullable: true,
            description: "Maximum number of attendees (1-50, null for unlimited)",
            example: 50,
            minimum: 1,
            maximum: 50,
          },
          tags: {
            type: "string",
            nullable: true,
            description: "Comma-separated tags",
            example: "tech, conference, networking",
            maxLength: 200,
          },
          eventUrl: {
            type: "string",
            format: "uri",
            nullable: true,
            description: "Event URL (for online/hybrid events)",
            example: "https://zoom.us/j/123456789",
            maxLength: 500,
          },
          contactEmail: {
            type: "string",
            format: "email",
            nullable: true,
            description: "Contact email for event inquiries",
            example: "organizer@example.com",
            maxLength: 100,
          },
          contactPhone: {
            type: "string",
            nullable: true,
            description: "Contact phone number",
            example: "+1 234 567 8900",
            minLength: 10,
            maxLength: 20,
          },
          requirements: {
            type: "string",
            nullable: true,
            description: "Event requirements",
            example: "Laptop required, Dress code: Formal",
            maxLength: 500,
          },
          refundPolicy: {
            type: "string",
            nullable: true,
            description: "Refund policy information",
            example: "Full refund available up to 7 days before the event",
            maxLength: 500,
          },
          ageRestriction: {
            type: "integer",
            nullable: true,
            description: "Minimum age required to attend",
            example: 18,
            minimum: 0,
            maximum: 99,
          },
          registrationDeadline: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Last date for registration (must be before event start)",
            example: "2024-06-10T00:00:00.000Z",
          },
          allowWaitlist: {
            type: "boolean",
            description: "Allow people to join waitlist when event is full",
            example: false,
            default: false,
          },
          sendReminders: {
            type: "boolean",
            description: "Automatically send reminders to registered attendees",
            example: true,
            default: true,
          },
          allowGuestRegistration: {
            type: "boolean",
            description: "Let users register without creating an account",
            example: false,
            default: false,
          },
          isPublished: {
            type: "boolean",
            description: "Make event visible to public immediately",
            example: true,
            default: true,
          },
          organizerId: {
            type: "string",
            description: "User ID of event organizer",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Event creation timestamp",
            example: "2024-01-01T00:00:00.000Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            description: "Last update timestamp",
            example: "2024-01-01T00:00:00.000Z",
          },
          _count: {
            type: "object",
            properties: {
              attendees: {
                type: "integer",
                description: "Number of registered attendees",
                example: 125,
              },
            },
          },
        },
        required: [
          "id",
          "title",
          "description",
          "body",
          "startDate",
          "endDate",
          "startTime",
          "endTime",
          "location",
          "category",
          "eventType",
          "price",
          "currency",
          "organizerId",
          "createdAt",
          "updatedAt",
        ],
      },
      // Attendee Schema
      Attendee: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique attendee record identifier",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          userId: {
            type: "string",
            description: "User ID of attendee",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          eventId: {
            type: "string",
            description: "Event ID",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          paymentStatus: {
            type: "string",
            enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"],
            description: "Payment status",
            example: "COMPLETED",
            default: "PENDING",
          },
          registeredAt: {
            type: "string",
            format: "date-time",
            description: "Registration timestamp",
            example: "2024-01-01T00:00:00.000Z",
          },
          user: {
            type: "object",
            properties: {
              id: {
                type: "string",
                example: "123e4567-e89b-12d3-a456-426614174000",
              },
              name: {
                type: "string",
                nullable: true,
                example: "John Doe",
              },
              email: {
                type: "string",
                format: "email",
                example: "john@example.com",
              },
              image: {
                type: "string",
                format: "uri",
                nullable: true,
                example: "https://example.com/images/user123.jpg",
              },
            },
          },
        },
      },
      // Create Event Request
      CreateEventRequest: {
        type: "object",
        required: [
          "title",
          "description",
          "body",
          "location",
          "startDate",
          "endDate",
          "startTime",
          "endTime",
          "category",
          "eventType",
          "price",
          "currency",
        ],
        properties: {
          title: {
            type: "string",
            description: "Event title (5-100 characters, alphanumeric and special chars)",
            example: "Summer Tech Conference 2025",
            minLength: 5,
            maxLength: 100,
            pattern: "^[a-zA-Z0-9\\s\\-_:!&(),.'\"]+$",
          },
          description: {
            type: "string",
            description: "Short event description (20-500 characters)",
            example: "Join us for an exciting tech conference featuring industry leaders and cutting-edge technologies.",
            minLength: 20,
            maxLength: 500,
          },
          body: {
            type: "string",
            description: "Detailed event description/body (min 50 characters, HTML/rich text)",
            example: "<p>Full event details with rich text content...</p>",
            minLength: 50,
          },
          location: {
            type: "string",
            description: "Event location/venue (3-200 characters)",
            example: "City Convention Center, New York",
            minLength: 3,
            maxLength: 200,
          },
          startDate: {
            type: "string",
            format: "date-time",
            description: "Event start date (ISO 8601, must be in future)",
            example: "2025-12-15T10:00:00.000Z",
          },
          endDate: {
            type: "string",
            format: "date-time",
            description: "Event end date (ISO 8601, must be after start date)",
            example: "2025-12-15T18:00:00.000Z",
          },
          startTime: {
            type: "string",
            description: "Event start time (HH:MM format, 24-hour)",
            example: "09:00",
            pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$",
          },
          endTime: {
            type: "string",
            description: "Event end time (HH:MM format, 24-hour)",
            example: "17:00",
            pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$",
          },
          category: {
            type: "string",
            enum: [
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
            description: "Event category",
            example: "Technology",
          },
          eventType: {
            type: "string",
            enum: ["offline", "online", "hybrid"],
            description: "Type of event (offline/online/hybrid)",
            example: "offline",
          },
          price: {
            type: "number",
            description: "Event ticket price (0 for free events)",
            example: 25.99,
            minimum: 0,
          },
          currency: {
            type: "string",
            enum: ["USD", "EUR", "INR", "GBP", "AUD", "CAD", "JPY", "CNY", "CHF", "SGD"],
            description: "Currency code (ISO 4217)",
            example: "USD",
            default: "USD",
          },
          maxAttendees: {
            type: "integer",
            description: "Maximum number of attendees (1-50, optional)",
            example: 50,
            minimum: 1,
            maximum: 50,
          },
          tags: {
            type: "string",
            description: "Comma-separated tags (max 200 characters)",
            example: "tech, conference, networking",
            maxLength: 200,
            pattern: "^[a-zA-Z0-9,\\s-]*$",
          },
          eventUrl: {
            type: "string",
            format: "uri",
            description: "Event URL for online/hybrid events (max 500 characters)",
            example: "https://zoom.us/j/123456789",
            maxLength: 500,
          },
          contactEmail: {
            type: "string",
            format: "email",
            description: "Contact email for event inquiries (max 100 characters)",
            example: "organizer@example.com",
            maxLength: 100,
          },
          contactPhone: {
            type: "string",
            description: "Contact phone number (10-20 characters)",
            example: "+1 234 567 8900",
            minLength: 10,
            maxLength: 20,
            pattern: "^[0-9+\\-() ]+$",
          },
          requirements: {
            type: "string",
            description: "Event requirements (max 500 characters)",
            example: "Laptop required, Dress code: Formal",
            maxLength: 500,
          },
          refundPolicy: {
            type: "string",
            description: "Refund policy information (max 500 characters)",
            example: "Full refund available up to 7 days before the event",
            maxLength: 500,
          },
          ageRestriction: {
            type: "integer",
            description: "Minimum age required to attend (0-99)",
            example: 18,
            minimum: 0,
            maximum: 99,
          },
          registrationDeadline: {
            type: "string",
            format: "date-time",
            description: "Last date for registration (must be before event start)",
            example: "2025-12-10T00:00:00.000Z",
          },
          allowWaitlist: {
            type: "string",
            description: "Allow people to join waitlist when event is full (true/false)",
            example: "true",
            enum: ["true", "false"],
          },
          sendReminders: {
            type: "string",
            description: "Automatically send reminders to registered attendees (true/false)",
            example: "true",
            enum: ["true", "false"],
          },
          allowGuestRegistration: {
            type: "string",
            description: "Let users register without creating an account (true/false)",
            example: "false",
            enum: ["true", "false"],
          },
          isPublished: {
            type: "string",
            description: "Make event visible to public immediately (true/false)",
            example: "true",
            enum: ["true", "false"],
          },
          image: {
            type: "string",
            format: "binary",
            description: "Event cover image file (max 10MB, PNG/JPG/GIF/WebP)",
          },
          video: {
            type: "string",
            format: "binary",
            description: "Event promotional video file (max 50MB, MP4/MOV/AVI/WebM)",
          },
        },
      },
      // API Response
      ApiResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Indicates if the request was successful",
            example: true,
          },
          status: {
            type: "object",
            properties: {
              code: {
                type: "integer",
                description: "HTTP status code",
                example: 200,
              },
              description: {
                type: "string",
                description: "HTTP status description",
                example: "OK",
              },
            },
          },
          message: {
            type: "string",
            description: "Human-readable response message",
            example: "Operation successful",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "Response timestamp (ISO 8601)",
            example: "2024-01-01T00:00:00.000Z",
          },
          responseTimeMs: {
            type: "number",
            description: "Response time in milliseconds",
            example: 45,
          },
          requestId: {
            type: "string",
            description: "Unique request identifier (UUID) for tracking",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          locale: {
            type: "string",
            description: "Response locale",
            example: "en-US",
          },
          data: {
            type: "object",
            nullable: true,
            description: "Response data payload",
          },
        },
        required: ["success", "status", "message", "timestamp"],
      },
      // Error Response
      ErrorResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Always false for errors",
            example: false,
          },
          status: {
            type: "object",
            properties: {
              code: {
                type: "integer",
                description: "HTTP status code",
                example: 400,
              },
              description: {
                type: "string",
                description: "HTTP status description",
                example: "Bad Request",
              },
            },
          },
          message: {
            type: "string",
            description: "Error message",
            example: "Invalid input provided",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            example: "2024-01-01T00:00:00.000Z",
          },
          responseTimeMs: {
            type: "number",
            example: 5,
          },
          requestId: {
            type: "string",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          locale: {
            type: "string",
            example: "en-US",
          },
          error: {
            type: "object",
            properties: {
              message: {
                type: "string",
                example: "Invalid input provided",
              },
              code: {
                type: "string",
                example: "INVALID_INPUT",
              },
              details: {
                type: "array",
                items: {
                  type: "object",
                },
              },
            },
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: "Authentication required - Invalid or missing JWT token",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              status: {
                code: 401,
                description: "Unauthorized",
              },
              message: "Not authorized, invalid token",
              timestamp: "2024-01-01T00:00:00.000Z",
              responseTimeMs: 5,
              requestId: "123e4567-e89b-12d3-a456-426614174000",
              locale: "en-US",
              error: {
                message: "Not authorized, invalid token",
                code: "TOKEN_INVALID",
              },
            },
          },
        },
      },
      NotFoundError: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              status: {
                code: 404,
                description: "Not Found",
              },
              message: "Event not found",
              timestamp: "2024-01-01T00:00:00.000Z",
              responseTimeMs: 15,
              requestId: "123e4567-e89b-12d3-a456-426614174000",
              locale: "en-US",
              error: {
                message: "Event not found",
                code: "EVENT_NOT_FOUND",
              },
            },
          },
        },
      },
      ValidationError: {
        description: "Validation failed - Invalid input data",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              status: {
                code: 400,
                description: "Bad Request",
              },
              message: "Invalid input provided",
              timestamp: "2024-01-01T00:00:00.000Z",
              responseTimeMs: 5,
              requestId: "123e4567-e89b-12d3-a456-426614174000",
              locale: "en-US",
              error: {
                message: "Invalid input provided",
                code: "INVALID_INPUT",
                details: [
                  {
                    field: "title",
                    issue: "Title must be at least 5 characters",
                  },
                  {
                    field: "startDate",
                    issue: "Start date must be in the future",
                  },
                ],
              },
            },
          },
        },
      },
      ServerError: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              status: {
                code: 500,
                description: "Internal Server Error",
              },
              message: "An unexpected error occurred. Please try again later",
              timestamp: "2024-01-01T00:00:00.000Z",
              responseTimeMs: 100,
              requestId: "123e4567-e89b-12d3-a456-426614174000",
              locale: "en-US",
              error: {
                message: "An unexpected error occurred. Please try again later",
                code: "INTERNAL_SERVER_ERROR",
              },
            },
          },
        },
      },
    },
  },
  paths: {
    "/api/v1/events/create": {
      post: {
        tags: ["Events"],
        summary: "Create a new event",
        description: `
Create a new event with comprehensive details, optional images and videos.

**Required Fields:**
- title (5-100 chars, pattern: alphanumeric + special chars)
- description (20-500 chars)
- body (min 50 chars, HTML/rich text)
- location (3-200 chars)
- startDate (ISO 8601, must be in future)
- endDate (ISO 8601, must be after startDate)
- startTime (HH:MM format, 24-hour)
- endTime (HH:MM format, 24-hour)
- category (enum: Music, Sports, Technology, etc.)
- eventType (offline/online/hybrid)
- price (number >= 0)
- currency (USD, EUR, INR, GBP, AUD, CAD, JPY, CNY, CHF, SGD)

**Optional Fields:**
- maxAttendees (1-50)
- tags (max 200 chars, comma-separated)
- eventUrl (valid URL, max 500 chars)
- contactEmail (valid email, max 100 chars)
- contactPhone (10-20 chars, pattern: numbers + +()-)
- requirements (max 500 chars)
- refundPolicy (max 500 chars)
- ageRestriction (0-99)
- registrationDeadline (ISO 8601, must be before startDate)
- allowWaitlist (boolean, default: false)
- sendReminders (boolean, default: true)
- allowGuestRegistration (boolean, default: false)
- isPublished (boolean, default: true)

**File Uploads:**
- Image: Max 10MB (PNG, JPG, GIF, WebP)
- Video: Max 50MB (MP4, MOV, AVI, WebM)
- Files are uploaded to R2 storage

**Validation Rules:**
- Title pattern: ^[a-zA-Z0-9\\s\\-_:!&(),.'"]+$
- Time format: ^([01]\\d|2[0-3]):([0-5]\\d)$
- Tags pattern: ^[a-zA-Z0-9,\\s-]*$
- Phone pattern: ^[0-9+\\-() ]+$
        `,
        operationId: "createEvent",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: [
                  "title",
                  "description",
                  "startDate",
                  "endDate",
                  "location",
                  "category",
                  "price",
                ],
                properties: {
                  title: {
                    type: "string",
                    example: "Tech Conference 2024",
                  },
                  description: {
                    type: "string",
                    example: "Annual technology conference featuring industry leaders",
                  },
                  body: {
                    type: "string",
                    example: "<p>Full event details with rich text content...</p>",
                  },
                  startDate: {
                    type: "string",
                    format: "date-time",
                    example: "2025-12-15T10:00:00.000Z",
                  },
                  endDate: {
                    type: "string",
                    format: "date-time",
                    example: "2025-12-15T18:00:00.000Z",
                  },
                  startTime: {
                    type: "string",
                    example: "09:00",
                  },
                  endTime: {
                    type: "string",
                    example: "17:00",
                  },
                  location: {
                    type: "string",
                    example: "City Convention Center, New York",
                  },
                  category: {
                    type: "string",
                    example: "Technology",
                  },
                  eventType: {
                    type: "string",
                    example: "offline",
                  },
                  price: {
                    type: "number",
                    example: 25.99,
                  },
                  currency: {
                    type: "string",
                    example: "USD",
                  },
                  maxAttendees: {
                    type: "integer",
                    example: 50,
                  },
                  tags: {
                    type: "string",
                    example: "tech, conference, networking",
                  },
                  eventUrl: {
                    type: "string",
                    example: "https://zoom.us/j/123456789",
                  },
                  contactEmail: {
                    type: "string",
                    example: "organizer@example.com",
                  },
                  contactPhone: {
                    type: "string",
                    example: "+1 234 567 8900",
                  },
                  requirements: {
                    type: "string",
                    example: "Laptop required, Dress code: Formal",
                  },
                  refundPolicy: {
                    type: "string",
                    example: "Full refund available up to 7 days before the event",
                  },
                  ageRestriction: {
                    type: "integer",
                    example: 18,
                  },
                  registrationDeadline: {
                    type: "string",
                    format: "date-time",
                    example: "2025-12-10T00:00:00.000Z",
                  },
                  allowWaitlist: {
                    type: "string",
                    example: "true",
                  },
                  sendReminders: {
                    type: "string",
                    example: "true",
                  },
                  allowGuestRegistration: {
                    type: "string",
                    example: "false",
                  },
                  isPublished: {
                    type: "string",
                    example: "true",
                  },
                  image: {
                    type: "string",
                    format: "binary",
                  },
                  video: {
                    type: "string",
                    format: "binary",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Event created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
                example: {
                  success: true,
                  status: {
                    code: 201,
                    description: "Created",
                  },
                  message: "Event created successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 250,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  data: {
                    id: "123e4567-e89b-12d3-a456-426614174000",
                    title: "Summer Tech Conference 2025",
                    description: "Join us for an exciting tech conference featuring industry leaders and cutting-edge technologies.",
                    body: "<p>Full event details with rich text content...</p>",
                    imageUrl: "https://cdn.example.com/events/tech-conf-2024.jpg",
                    videoUrl: "https://cdn.example.com/events/tech-conf-2024.mp4",
                    startDate: "2025-12-15T10:00:00.000Z",
                    endDate: "2025-12-15T18:00:00.000Z",
                    startTime: "09:00",
                    endTime: "17:00",
                    location: "City Convention Center, New York",
                    category: "Technology",
                    eventType: "offline",
                    price: 25.99,
                    currency: "USD",
                    maxAttendees: 50,
                    tags: "tech, conference, networking",
                    eventUrl: null,
                    contactEmail: "organizer@example.com",
                    contactPhone: "+1 234 567 8900",
                    requirements: "Laptop required, Dress code: Formal",
                    refundPolicy: "Full refund available up to 7 days before the event",
                    ageRestriction: 18,
                    registrationDeadline: "2025-12-10T00:00:00.000Z",
                    allowWaitlist: false,
                    sendReminders: true,
                    allowGuestRegistration: false,
                    isPublished: true,
                    organizerId: "123e4567-e89b-12d3-a456-426614174000",
                    createdAt: "2024-01-01T00:00:00.000Z",
                    updatedAt: "2024-01-01T00:00:00.000Z",
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "500": {
            $ref: "#/components/responses/ServerError",
          },
        },
      },
    },
    "/api/v1/events/get": {
      get: {
        tags: ["Events"],
        summary: "Get events organized by current user",
        description: `
Retrieve all events organized by the currently authenticated user.

**Features:**
- Returns events created by the user
- Includes attendee count for each event
- Sorted by creation date (newest first)
        `,
        operationId: "getMyEvents",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Events retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
                example: {
                  success: true,
                  status: {
                    code: 200,
                    description: "OK",
                  },
                  message: "Events retrieved successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 45,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  data: [
                    {
                      id: "123e4567-e89b-12d3-a456-426614174000",
                      title: "Tech Conference 2024",
                      description: "Annual technology conference",
                      image: "https://cdn.example.com/events/tech-conf-2024.jpg",
                      startDate: "2024-06-15T09:00:00.000Z",
                      endDate: "2024-06-15T18:00:00.000Z",
                      location: "San Francisco Convention Center",
                      category: "Technology",
                      price: 5000,
                      currency: "INR",
                      status: "UPCOMING",
                      _count: {
                        attendees: 125,
                      },
                      createdAt: "2024-01-01T00:00:00.000Z",
                      updatedAt: "2024-01-01T00:00:00.000Z",
                    },
                  ],
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "500": {
            $ref: "#/components/responses/ServerError",
          },
        },
      },
    },
    "/api/v1/events/all": {
      get: {
        tags: ["Events"],
        summary: "Get all events",
        description: `
Retrieve all available events with pagination support.

**Features:**
- Returns all events in the system
- Includes attendee count for each event
- Sorted by start date (upcoming first)
- Pagination support via query parameters

**Query Parameters:**
- page: Page number (default: 1)
- limit: Items per page (default: 20, max: 100)
        `,
        operationId: "getAllEvents",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            description: "Page number",
            schema: {
              type: "integer",
              default: 1,
              minimum: 1,
            },
          },
          {
            name: "limit",
            in: "query",
            description: "Items per page",
            schema: {
              type: "integer",
              default: 20,
              minimum: 1,
              maximum: 100,
            },
          },
        ],
        responses: {
          "200": {
            description: "Events retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
                example: {
                  success: true,
                  status: {
                    code: 200,
                    description: "OK",
                  },
                  message: "Events retrieved successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 65,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  data: {
                    events: [
                      {
                        id: "123e4567-e89b-12d3-a456-426614174000",
                        title: "Tech Conference 2024",
                        description: "Annual technology conference",
                        image: "https://cdn.example.com/events/tech-conf-2024.jpg",
                        startDate: "2024-06-15T09:00:00.000Z",
                        endDate: "2024-06-15T18:00:00.000Z",
                        location: "San Francisco Convention Center",
                        category: "Technology",
                        price: 5000,
                        currency: "INR",
                        status: "UPCOMING",
                        _count: {
                          attendees: 125,
                        },
                        createdAt: "2024-01-01T00:00:00.000Z",
                      },
                    ],
                    pagination: {
                      page: 1,
                      limit: 20,
                      total: 50,
                      totalPages: 3,
                    },
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "500": {
            $ref: "#/components/responses/ServerError",
          },
        },
      },
    },
    "/api/v1/events/{id}": {
      get: {
        tags: ["Events"],
        summary: "Get event by ID",
        description: `
Retrieve detailed information about a specific event.

**Features:**
- Returns complete event details
- Includes organizer information
- Shows attendee count
        `,
        operationId: "getEventById",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Event ID (UUID)",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "Event retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
                example: {
                  success: true,
                  status: {
                    code: 200,
                    description: "OK",
                  },
                  message: "Event retrieved successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 35,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  data: {
                    id: "123e4567-e89b-12d3-a456-426614174000",
                    title: "Tech Conference 2024",
                    description: "Annual technology conference featuring industry leaders",
                    body: "<p>Join us for an amazing conference...</p>",
                    image: "https://cdn.example.com/events/tech-conf-2024.jpg",
                    video: "https://cdn.example.com/events/tech-conf-2024.mp4",
                    startDate: "2024-06-15T09:00:00.000Z",
                    endDate: "2024-06-15T18:00:00.000Z",
                    location: "San Francisco Convention Center",
                    category: "Technology",
                    price: 5000,
                    currency: "INR",
                    maxAttendees: 500,
                    status: "UPCOMING",
                    organizerId: "123e4567-e89b-12d3-a456-426614174000",
                    organizer: {
                      id: "123e4567-e89b-12d3-a456-426614174000",
                      name: "John Doe",
                      email: "john@example.com",
                      image: "https://example.com/images/user123.jpg",
                    },
                    _count: {
                      attendees: 125,
                    },
                    createdAt: "2024-01-01T00:00:00.000Z",
                    updatedAt: "2024-01-01T00:00:00.000Z",
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/ServerError",
          },
        },
      },
    },
    "/api/v1/events/{id}/register": {
      post: {
        tags: ["Registration"],
        summary: "Register for an event",
        description: `
Register the authenticated user for an event.

**Features:**
- Free events: Instant registration
- Paid events: Creates Razorpay payment order
- Prevents duplicate registrations
- Checks capacity limits

**Payment Flow (Paid Events):**
1. User initiates registration
2. Backend creates Razorpay order
3. Returns order details to frontend
4. Frontend displays Razorpay checkout
5. User completes payment
6. Webhook updates registration status
        `,
        operationId: "eventRegister",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Event ID (UUID)",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "201": {
            description: "Registration successful",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
                examples: {
                  freeEvent: {
                    summary: "Free event registration",
                    value: {
                      success: true,
                      status: {
                        code: 201,
                        description: "Created",
                      },
                      message: "Successfully registered for the event",
                      timestamp: "2024-01-01T00:00:00.000Z",
                      responseTimeMs: 85,
                      requestId: "123e4567-e89b-12d3-a456-426614174000",
                      locale: "en-US",
                      data: {
                        id: "123e4567-e89b-12d3-a456-426614174000",
                        userId: "123e4567-e89b-12d3-a456-426614174000",
                        eventId: "123e4567-e89b-12d3-a456-426614174000",
                        paymentStatus: "COMPLETED",
                        registeredAt: "2024-01-01T00:00:00.000Z",
                      },
                    },
                  },
                  paidEvent: {
                    summary: "Paid event registration (payment required)",
                    value: {
                      success: true,
                      status: {
                        code: 201,
                        description: "Created",
                      },
                      message:
                        "Payment order created. Please complete payment to confirm registration",
                      timestamp: "2024-01-01T00:00:00.000Z",
                      responseTimeMs: 120,
                      requestId: "123e4567-e89b-12d3-a456-426614174000",
                      locale: "en-US",
                      data: {
                        registration: {
                          id: "123e4567-e89b-12d3-a456-426614174000",
                          userId: "123e4567-e89b-12d3-a456-426614174000",
                          eventId: "123e4567-e89b-12d3-a456-426614174000",
                          paymentStatus: "PENDING",
                          registeredAt: "2024-01-01T00:00:00.000Z",
                        },
                        order: {
                          id: "order_xyz123",
                          amount: 500000,
                          currency: "INR",
                          receipt: "receipt_event_123",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - Already registered or event full",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                examples: {
                  alreadyRegistered: {
                    summary: "Already registered",
                    value: {
                      success: false,
                      status: {
                        code: 400,
                        description: "Bad Request",
                      },
                      message: "User is already registered for this event",
                      timestamp: "2024-01-01T00:00:00.000Z",
                      responseTimeMs: 15,
                      requestId: "123e4567-e89b-12d3-a456-426614174000",
                      locale: "en-US",
                      error: {
                        message: "User is already registered for this event",
                        code: "ALREADY_REGISTERED",
                      },
                    },
                  },
                  eventFull: {
                    summary: "Event at capacity",
                    value: {
                      success: false,
                      status: {
                        code: 400,
                        description: "Bad Request",
                      },
                      message: "Event has reached maximum capacity",
                      timestamp: "2024-01-01T00:00:00.000Z",
                      responseTimeMs: 20,
                      requestId: "123e4567-e89b-12d3-a456-426614174000",
                      locale: "en-US",
                      error: {
                        message: "Event has reached maximum capacity",
                        code: "EVENT_FULL",
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/ServerError",
          },
        },
      },
    },
    "/api/v1/events/{id}/registered": {
      get: {
        tags: ["Registration"],
        summary: "Check event registration status",
        description: `
Check if the authenticated user is registered for a specific event.

**Features:**
- Returns registration status
- Includes payment status for paid events
        `,
        operationId: "checkEventRegistration",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Event ID (UUID)",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "Registration status retrieved",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
                examples: {
                  registered: {
                    summary: "User is registered",
                    value: {
                      success: true,
                      status: {
                        code: 200,
                        description: "OK",
                      },
                      message: "User is registered for this event",
                      timestamp: "2024-01-01T00:00:00.000Z",
                      responseTimeMs: 25,
                      requestId: "123e4567-e89b-12d3-a456-426614174000",
                      locale: "en-US",
                      data: {
                        isRegistered: true,
                        registration: {
                          id: "123e4567-e89b-12d3-a456-426614174000",
                          paymentStatus: "COMPLETED",
                          registeredAt: "2024-01-01T00:00:00.000Z",
                        },
                      },
                    },
                  },
                  notRegistered: {
                    summary: "User is not registered",
                    value: {
                      success: true,
                      status: {
                        code: 200,
                        description: "OK",
                      },
                      message: "User is not registered for this event",
                      timestamp: "2024-01-01T00:00:00.000Z",
                      responseTimeMs: 20,
                      requestId: "123e4567-e89b-12d3-a456-426614174000",
                      locale: "en-US",
                      data: {
                        isRegistered: false,
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/ServerError",
          },
        },
      },
    },
    "/api/v1/events/{id}/attendees": {
      get: {
        tags: ["Registration"],
        summary: "Get event attendees",
        description: `
Retrieve the list of attendees for a specific event.

**Features:**
- Returns all registered attendees
- Includes user profile information
- Shows payment status
- Only returns attendees with COMPLETED payment status

**Visibility:**
- Available to all authenticated users
- Useful for networking before events
        `,
        operationId: "getEventAttendees",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Event ID (UUID)",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "Attendees retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
                example: {
                  success: true,
                  status: {
                    code: 200,
                    description: "OK",
                  },
                  message: "Attendees retrieved successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 55,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  data: [
                    {
                      id: "123e4567-e89b-12d3-a456-426614174000",
                      userId: "123e4567-e89b-12d3-a456-426614174000",
                      eventId: "123e4567-e89b-12d3-a456-426614174000",
                      paymentStatus: "COMPLETED",
                      registeredAt: "2024-01-01T00:00:00.000Z",
                      user: {
                        id: "123e4567-e89b-12d3-a456-426614174000",
                        name: "John Doe",
                        email: "john@example.com",
                        image: "https://example.com/images/user123.jpg",
                      },
                    },
                    {
                      id: "223e4567-e89b-12d3-a456-426614174001",
                      userId: "223e4567-e89b-12d3-a456-426614174001",
                      eventId: "123e4567-e89b-12d3-a456-426614174000",
                      paymentStatus: "COMPLETED",
                      registeredAt: "2024-01-02T00:00:00.000Z",
                      user: {
                        id: "223e4567-e89b-12d3-a456-426614174001",
                        name: "Jane Smith",
                        email: "jane@example.com",
                        image: "https://example.com/images/user456.jpg",
                      },
                    },
                  ],
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "500": {
            $ref: "#/components/responses/ServerError",
          },
        },
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: [], // No need to scan files since we define everything here
};

export const swaggerSpec = swaggerJsdoc(options);

