import swaggerJSDoc from "swagger-jsdoc";
import { env } from "../../shared/config/env";

const swaggerDefinition: swaggerJSDoc.OAS3Definition = {
  openapi: "3.0.0",
  info: {
    title: "User Service API",
    version: "1.0.0",
    description: `
# User Service API Documentation

This API provides comprehensive user profile management, event tracking, and password management functionality.

## Overview
The User Service handles user profile operations, profile image uploads, event registration tracking, password changes, and organized event management.

## Authentication
All endpoints require authentication via JWT token stored in an HTTP-only cookie named \`token\`. 
The token is automatically set when you register or login via the Auth Service, and is valid for 24 hours.

## Base URL
- **Development**: http://localhost:8002
- **Production**: (Configure in environment)

## Response Format
All responses follow a standardized format:
\`\`\`json
{
  "success": true,
  "status": {
    "code": 200,
    "description": "OK"
  },
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "responseTimeMs": 45,
  "requestId": "uuid-here",
  "locale": "en-US",
  "data": { ... },
  "error": null
}
\`\`\`

## Error Responses
Errors follow the same format with \`success: false\` and an \`error\` object containing details.

## Rate Limiting
Currently no rate limiting is implemented, but it's recommended for production use.

## Support
For issues or questions, please contact the development team.
    `,
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
      url: `http://localhost:${env.PORT || 3002}`,
      description: "Development server",
    },
    {
      url: "https://api.example.com",
      description: "Production server (example)",
    },
  ],
  tags: [
    {
      name: "User Profile",
      description: "User profile management endpoints",
    },
    {
      name: "Password Management",
      description: "Password change functionality",
    },
    {
      name: "Events",
      description: "User event registrations and organized events tracking",
    },
    {
      name: "Images",
      description: "Profile image upload and management",
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "token",
        description:
          "JWT token stored in an HTTP-only cookie. Automatically set on login/register via Auth Service. Valid for 24 hours.",
      },
    },
    schemas: {
      // User Schema
      User: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique user identifier (UUID)",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          email: {
            type: "string",
            format: "email",
            description: "User's email address (unique)",
            example: "user@example.com",
          },
          username: {
            type: "string",
            description: "Unique username (3-50 characters, alphanumeric and underscore only)",
            example: "johndoe",
            minLength: 3,
            maxLength: 50,
          },
          name: {
            type: "string",
            nullable: true,
            description: "User's full name (optional)",
            example: "John Doe",
          },
          gender: {
            type: "string",
            enum: ["Male", "Female", "Other"],
            description: "User's gender",
            example: "Male",
          },
          image: {
            type: "string",
            format: "uri",
            description: "URL to user's profile image",
            example: "https://example.com/images/user123.jpg",
          },
          role: {
            type: "string",
            enum: ["USER", "ADMIN"],
            description: "User's role",
            example: "USER",
            default: "USER",
          },
          phone: {
            type: "string",
            nullable: true,
            description: "User's phone number",
            example: "+1234567890",
          },
          bio: {
            type: "string",
            nullable: true,
            description: "User's bio (max 500 characters)",
            example: "Passionate developer and event enthusiast",
          },
          dateOfBirth: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "User's date of birth",
            example: "1990-01-15T00:00:00.000Z",
          },
          city: {
            type: "string",
            nullable: true,
            description: "User's city",
            example: "New York",
          },
          country: {
            type: "string",
            nullable: true,
            description: "User's country",
            example: "United States",
          },
          company: {
            type: "string",
            nullable: true,
            description: "User's company/organization",
            example: "Tech Corp",
          },
          jobTitle: {
            type: "string",
            nullable: true,
            description: "User's job title",
            example: "Software Engineer",
          },
          website: {
            type: "string",
            format: "uri",
            nullable: true,
            description: "User's personal website",
            example: "https://johndoe.com",
          },
          linkedinUrl: {
            type: "string",
            format: "uri",
            nullable: true,
            description: "User's LinkedIn profile URL",
            example: "https://linkedin.com/in/johndoe",
          },
          twitterUrl: {
            type: "string",
            format: "uri",
            nullable: true,
            description: "User's Twitter/X profile URL",
            example: "https://twitter.com/johndoe",
          },
          instagramUrl: {
            type: "string",
            format: "uri",
            nullable: true,
            description: "User's Instagram profile URL",
            example: "https://instagram.com/johndoe",
          },
          isActive: {
            type: "boolean",
            description: "Account active status",
            example: true,
            default: true,
          },
          lastLoginAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Last login timestamp",
            example: "2024-01-01T00:00:00.000Z",
          },
          notificationsEnabled: {
            type: "boolean",
            description: "Email notifications enabled",
            example: true,
            default: true,
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Account creation timestamp",
            example: "2024-01-01T00:00:00.000Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            description: "Last update timestamp",
            example: "2024-01-01T00:00:00.000Z",
          },
        },
        required: ["id", "email", "username", "role", "createdAt", "updatedAt"],
      },
      // Update Profile Request
      UpdateProfileRequest: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "User's full name (2-100 characters)",
            example: "John Doe Updated",
            minLength: 2,
            maxLength: 100,
          },
          phone: {
            type: "string",
            description: "Phone number (10-15 digits)",
            example: "+1234567890",
            minLength: 10,
            maxLength: 15,
          },
          bio: {
            type: "string",
            description: "User bio (max 500 characters)",
            example: "Passionate developer and event enthusiast",
            maxLength: 500,
          },
          dateOfBirth: {
            type: "string",
            format: "date-time",
            description: "Date of birth (ISO 8601 format)",
            example: "1990-01-15T00:00:00.000Z",
          },
          city: {
            type: "string",
            description: "City (2-100 characters)",
            example: "New York",
            minLength: 2,
            maxLength: 100,
          },
          country: {
            type: "string",
            description: "Country (2-100 characters)",
            example: "United States",
            minLength: 2,
            maxLength: 100,
          },
          company: {
            type: "string",
            description: "Company/organization (max 100 characters)",
            example: "Tech Corp",
            maxLength: 100,
          },
          jobTitle: {
            type: "string",
            description: "Job title (max 100 characters)",
            example: "Software Engineer",
            maxLength: 100,
          },
          website: {
            type: "string",
            format: "uri",
            description: "Personal website URL",
            example: "https://johndoe.com",
          },
          linkedinUrl: {
            type: "string",
            format: "uri",
            description: "LinkedIn profile URL",
            example: "https://linkedin.com/in/johndoe",
          },
          twitterUrl: {
            type: "string",
            format: "uri",
            description: "Twitter/X profile URL",
            example: "https://twitter.com/johndoe",
          },
          instagramUrl: {
            type: "string",
            format: "uri",
            description: "Instagram profile URL",
            example: "https://instagram.com/johndoe",
          },
          notificationsEnabled: {
            type: "boolean",
            description: "Enable/disable email notifications",
            example: true,
          },
        },
        example: {
          name: "John Doe Updated",
          phone: "+1234567890",
          bio: "Passionate developer and event enthusiast",
          city: "New York",
          country: "United States",
          company: "Tech Corp",
          jobTitle: "Software Engineer",
          notificationsEnabled: true,
        },
      },
      // Change Password Request
      ChangePasswordRequest: {
        type: "object",
        required: ["oldPassword", "newPassword", "confirmPassword"],
        properties: {
          oldPassword: {
            type: "string",
            description: "Current password",
            example: "OldPass123",
            minLength: 8,
            maxLength: 20,
          },
          newPassword: {
            type: "string",
            description:
              "New password. Must be 8-20 characters, contain at least one lowercase, one uppercase, and one digit. Must be different from old password.",
            example: "NewSecurePass123",
            minLength: 8,
            maxLength: 20,
            pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)",
          },
          confirmPassword: {
            type: "string",
            description: "Must match newPassword",
            example: "NewSecurePass123",
            minLength: 8,
            maxLength: 20,
          },
        },
        example: {
          oldPassword: "OldPass123",
          newPassword: "NewSecurePass123",
          confirmPassword: "NewSecurePass123",
        },
      },
      // Event Schema
      Event: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique event identifier",
            example: "event-123e4567",
          },
          title: {
            type: "string",
            description: "Event title",
            example: "Tech Conference 2024",
          },
          description: {
            type: "string",
            description: "Short event description",
            example: "Annual technology conference featuring latest innovations",
          },
          body: {
            type: "string",
            description: "Detailed event description",
            example: "Join us for the biggest tech conference of the year...",
          },
          startDate: {
            type: "string",
            format: "date-time",
            description: "Event start date and time",
            example: "2024-06-01T09:00:00.000Z",
          },
          endDate: {
            type: "string",
            format: "date-time",
            description: "Event end date and time",
            example: "2024-06-01T17:00:00.000Z",
          },
          location: {
            type: "string",
            description: "Event location",
            example: "Convention Center, New York, NY",
          },
          category: {
            type: "string",
            description: "Event category",
            example: "Technology",
          },
          price: {
            type: "number",
            description: "Event ticket price",
            example: 99.99,
          },
          currency: {
            type: "string",
            description: "Price currency code",
            example: "USD",
          },
          imageUrl: {
            type: "string",
            format: "uri",
            description: "Event banner/poster image URL",
            example: "https://example.com/events/event123.jpg",
          },
          videoUrl: {
            type: "string",
            format: "uri",
            nullable: true,
            description: "Event promotional video URL (optional)",
            example: "https://example.com/events/event123.mp4",
          },
          organizerId: {
            type: "string",
            description: "Organizer user ID",
            example: "user-123e4567",
          },
          organizer: {
            type: "object",
            properties: {
              id: {
                type: "string",
                example: "user-123e4567",
              },
              name: {
                type: "string",
                example: "John Doe",
              },
              email: {
                type: "string",
                example: "organizer@example.com",
              },
            },
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2024-01-01T00:00:00.000Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            example: "2024-01-01T00:00:00.000Z",
          },
        },
      },
      // Attendee Schema
      Attendee: {
        type: "object",
        properties: {
          id: {
            type: "string",
            example: "attendee-123",
          },
          userId: {
            type: "string",
            example: "user-456",
          },
          eventId: {
            type: "string",
            example: "event-789",
          },
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              email: { type: "string" },
            },
          },
          registeredAt: {
            type: "string",
            format: "date-time",
            example: "2024-01-01T00:00:00.000Z",
          },
        },
      },
      // Standard API Response
      ApiResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Whether the request was successful",
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
            description: "Human-readable message",
            example: "Operation successful",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "Response timestamp in ISO 8601 format",
            example: "2024-01-01T00:00:00.000Z",
          },
          responseTimeMs: {
            type: "integer",
            description: "Request processing time in milliseconds",
            example: 45,
          },
          requestId: {
            type: "string",
            format: "uuid",
            description: "Unique request identifier for tracking",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          locale: {
            type: "string",
            description: "Response locale",
            example: "en-US",
            default: "en-US",
          },
          data: {
            type: "object",
            description: "Response data (varies by endpoint)",
            nullable: true,
          },
          error: {
            type: "object",
            nullable: true,
            description: "Error details (only present when success is false)",
          },
        },
        required: [
          "success",
          "status",
          "message",
          "timestamp",
          "responseTimeMs",
          "requestId",
          "locale",
        ],
      },
      // Error Response
      ErrorResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          status: {
            type: "object",
            properties: {
              code: {
                type: "integer",
                example: 400,
              },
              description: {
                type: "string",
                example: "Bad Request",
              },
            },
          },
          message: {
            type: "string",
            example: "Invalid input provided",
          },
          timestamp: {
            type: "string",
            format: "date-time",
          },
          responseTimeMs: {
            type: "integer",
          },
          requestId: {
            type: "string",
            format: "uuid",
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
                example: "Validation failed",
              },
              code: {
                type: "string",
                example: "INVALID_INPUT",
                description:
                  "Error code. See Error Codes section for all possible codes.",
              },
              details: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field: {
                      type: "string",
                      example: "email",
                    },
                    issue: {
                      type: "string",
                      example: "Invalid email address",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description:
          "Authentication required. Either no token provided or token is invalid/expired.",
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
              message: "User not authenticated",
              timestamp: "2024-01-01T00:00:00.000Z",
              responseTimeMs: 12,
              requestId: "123e4567-e89b-12d3-a456-426614174000",
              locale: "en-US",
              error: {
                message: "User not authenticated",
                code: "NOT_AUTHENTICATED",
              },
            },
          },
        },
      },
      ValidationError: {
        description: "Invalid input provided. Check error.details for field-specific issues.",
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
              responseTimeMs: 8,
              requestId: "123e4567-e89b-12d3-a456-426614174000",
              locale: "en-US",
              error: {
                message: "Invalid input provided",
                code: "INVALID_INPUT",
                details: [
                  {
                    field: "email",
                    issue: "Invalid email address",
                  },
                  {
                    field: "username",
                    issue: "Username must be at least 3 characters",
                  },
                ],
              },
            },
          },
        },
      },
      ConflictError: {
        description: "Resource already exists (e.g., email or username already taken).",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              status: {
                code: 409,
                description: "Conflict",
              },
              message: "Username already exists",
              timestamp: "2024-01-01T00:00:00.000Z",
              responseTimeMs: 15,
              requestId: "123e4567-e89b-12d3-a456-426614174000",
              locale: "en-US",
              error: {
                message: "Username already exists",
                code: "USERNAME_EXISTS",
              },
            },
          },
        },
      },
      NotFoundError: {
        description: "Requested resource not found.",
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
              message: "User not found",
              timestamp: "2024-01-01T00:00:00.000Z",
              responseTimeMs: 10,
              requestId: "123e4567-e89b-12d3-a456-426614174000",
              locale: "en-US",
              error: {
                message: "User not found",
                code: "USER_NOT_FOUND",
              },
            },
          },
        },
      },
      ServerError: {
        description: "Internal server error. Check logs for details.",
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
              message: "Internal server error",
              timestamp: "2024-01-01T00:00:00.000Z",
              responseTimeMs: 120,
              requestId: "123e4567-e89b-12d3-a456-426614174000",
              locale: "en-US",
              error: {
                message: "Failed to fetch user profile",
                code: "INTERNAL_SERVER_ERROR",
              },
            },
          },
        },
      },
    },
  },
  paths: {
    "/api/v1/users/profile": {
      get: {
        tags: ["User Profile"],
        summary: "Get authenticated user profile",
        description: `
Retrieve the profile information of the currently authenticated user.
This endpoint requires a valid JWT token in the cookie.

**Returns:**
- User ID, email, username
- Name, gender, profile image
- Role and account timestamps
        `,
        operationId: "getUserProfile",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "User profile retrieved successfully",
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
                  message: "User profile retrieved successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 25,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  data: {
                    id: "123e4567-e89b-12d3-a456-426614174000",
                    email: "user@example.com",
                    username: "johndoe",
                    name: "John Doe",
                    gender: "Male",
                    image: "https://example.com/images/user123.jpg",
                    role: "USER",
                    phone: "+1234567890",
                    bio: "Passionate developer and event enthusiast",
                    dateOfBirth: "1990-01-15T00:00:00.000Z",
                    city: "New York",
                    country: "United States",
                    company: "Tech Corp",
                    jobTitle: "Software Engineer",
                    website: "https://johndoe.com",
                    linkedinUrl: "https://linkedin.com/in/johndoe",
                    twitterUrl: "https://twitter.com/johndoe",
                    instagramUrl: "https://instagram.com/johndoe",
                    isActive: true,
                    lastLoginAt: "2024-01-01T12:00:00.000Z",
                    notificationsEnabled: true,
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
      put: {
        tags: ["User Profile"],
        summary: "Update user profile",
        description: `
Update user profile information including personal details, professional info, and social links.

**Note:** Username and email are permanent identifiers and cannot be changed after registration.

**Updatable Fields:**
- **Personal**: name, phone, bio, dateOfBirth, city, country
- **Professional**: company, jobTitle, website
- **Social**: linkedinUrl, twitterUrl, instagramUrl
- **Settings**: notificationsEnabled

**Features:**
- All fields are optional - update only what you need
- Returns complete updated user profile
- Empty strings for URLs and dates will be saved as null

**Validation:**
- Name: 2-100 characters
- Phone: 10-15 characters, numbers and +()-
- Bio: Max 500 characters
- City/Country: 2-100 characters
- URLs: Valid URL format
        `,
        operationId: "updateUserProfile",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateProfileRequest",
              },
              examples: {
                updateBasicInfo: {
                  summary: "Update basic info",
                  value: {
                    name: "John Doe Updated",
                    phone: "+1234567890",
                    city: "New York",
                    country: "United States",
                  },
                },
                updateProfessionalInfo: {
                  summary: "Update professional info",
                  value: {
                    company: "Tech Corp",
                    jobTitle: "Senior Software Engineer",
                    website: "https://johndoe.com",
                  },
                },
                updateSocialLinks: {
                  summary: "Update social media links",
                  value: {
                    linkedinUrl: "https://linkedin.com/in/johndoe",
                    twitterUrl: "https://twitter.com/johndoe",
                    instagramUrl: "https://instagram.com/johndoe",
                  },
                },
                updateAll: {
                  summary: "Update multiple fields",
                  value: {
                    name: "John Doe Updated",
                    phone: "+1234567890",
                    bio: "Passionate developer and event enthusiast",
                    city: "New York",
                    country: "United States",
                    company: "Tech Corp",
                    jobTitle: "Software Engineer",
                    website: "https://johndoe.com",
                    linkedinUrl: "https://linkedin.com/in/johndoe",
                    notificationsEnabled: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Profile updated successfully",
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
                  message: "Profile updated successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 45,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  data: {
                    id: "123e4567-e89b-12d3-a456-426614174000",
                    email: "user@example.com",
                    username: "johndoe",
                    name: "John Doe Updated",
                    gender: "Male",
                    image: "https://example.com/images/user123.jpg",
                    role: "USER",
                    phone: "+1234567890",
                    bio: "Passionate developer and event enthusiast",
                    dateOfBirth: "1990-01-15T00:00:00.000Z",
                    city: "New York",
                    country: "United States",
                    company: "Tech Corp",
                    jobTitle: "Software Engineer",
                    website: "https://johndoe.com",
                    linkedinUrl: "https://linkedin.com/in/johndoe",
                    twitterUrl: "https://twitter.com/johndoe",
                    instagramUrl: "https://instagram.com/johndoe",
                    isActive: true,
                    lastLoginAt: "2024-01-01T12:00:00.000Z",
                    notificationsEnabled: true,
                    createdAt: "2024-01-01T00:00:00.000Z",
                    updatedAt: "2024-01-02T00:00:00.000Z",
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid input or no fields to update",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                examples: {
                  noFields: {
                    summary: "No fields provided",
                    value: {
                      success: false,
                      status: {
                        code: 400,
                        description: "Bad Request",
                      },
                      message: "No fields to update",
                      timestamp: "2024-01-01T00:00:00.000Z",
                      responseTimeMs: 5,
                      requestId: "123e4567-e89b-12d3-a456-426614174000",
                      locale: "en-US",
                      error: {
                        message: "No fields to update",
                        code: "INVALID_INPUT",
                      },
                    },
                  },
                  validation: {
                    $ref: "#/components/responses/ValidationError",
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
    "/api/v1/users/profile-image": {
      put: {
        tags: ["Images"],
        summary: "Update profile image",
        description: `
Upload and update user profile image.

**File Upload:**
- Field name: \`image\`
- Accepts image files (JPEG, PNG, GIF, etc.)
- Uploaded to R2/S3 storage
- Old image is deleted automatically

**Process:**
1. Validates user authentication
2. Checks if image file is provided
3. Uploads new image to cloud storage
4. Updates user profile with new image URL
5. Deletes old image from storage
6. Returns updated user data

**Returns:**
Updated user profile with new image URL

**Storage:** Images are stored in the \`profiles\` folder on R2/S3.
        `,
        operationId: "updateProfileImage",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["image"],
                properties: {
                  image: {
                    type: "string",
                    format: "binary",
                    description: "Profile image file (JPEG, PNG, GIF, etc.)",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Profile image updated successfully",
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
                  message: "Profile image updated successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 350,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  data: {
                    id: "123e4567-e89b-12d3-a456-426614174000",
                    email: "user@example.com",
                    username: "johndoe",
                    name: "John Doe",
                    gender: "Male",
                    image: "https://r2.cloudflare.com/bucket/new-profile-image.jpg",
                    role: "USER",
                    createdAt: "2024-01-01T00:00:00.000Z",
                    updatedAt: "2024-01-02T00:00:00.000Z",
                  },
                },
              },
            },
          },
          "400": {
            description: "No image file provided or invalid file",
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
                  message: "No image file provided",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 5,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  error: {
                    message: "No image file provided",
                    code: "INVALID_INPUT",
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
    "/api/v1/users/change-password": {
      post: {
        tags: ["Password Management"],
        summary: "Change user password",
        description: `
Change the password for the currently authenticated user. This endpoint:
- Requires the current password for verification
- Validates that the new password meets complexity requirements
- Ensures the new password is different from the old password
- Updates the password hash in the database using bcrypt (10 salt rounds)

**Password Requirements:**
- Must be 8-20 characters
- Must contain at least one lowercase letter
- Must contain at least one uppercase letter
- Must contain at least one digit
- Can include special characters: @$!%*?&
- Must be different from the current password
- Must match the confirmation password

**Security:**
- Old password is verified using bcrypt.compare()
- New password is hashed using bcrypt.hash() with 10 salt rounds
- Password hashes are never returned in responses
        `,
        operationId: "changeUserPassword",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ChangePasswordRequest",
              },
              examples: {
                valid: {
                  summary: "Valid password change",
                  value: {
                    oldPassword: "OldPass123",
                    newPassword: "NewSecurePass123",
                    confirmPassword: "NewSecurePass123",
                  },
                },
                passwordsMismatch: {
                  summary: "Passwords don't match",
                  value: {
                    oldPassword: "OldPass123",
                    newPassword: "NewSecurePass123",
                    confirmPassword: "DifferentPass123",
                  },
                },
                samePassword: {
                  summary: "New password same as old",
                  value: {
                    oldPassword: "OldPass123",
                    newPassword: "OldPass123",
                    confirmPassword: "OldPass123",
                  },
                },
                weakPassword: {
                  summary: "Password doesn't meet requirements",
                  value: {
                    oldPassword: "OldPass123",
                    newPassword: "weak",
                    confirmPassword: "weak",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password changed successfully",
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
                  message: "Password changed successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 150,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  data: null,
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            description: "Unauthorized - Invalid old password or not authenticated",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                examples: {
                  invalidOldPassword: {
                    summary: "Incorrect old password",
                    value: {
                      success: false,
                      status: {
                        code: 401,
                        description: "Unauthorized",
                      },
                      message: "Old password is incorrect",
                      timestamp: "2024-01-01T00:00:00.000Z",
                      responseTimeMs: 45,
                      requestId: "123e4567-e89b-12d3-a456-426614174000",
                      locale: "en-US",
                      error: {
                        message: "Old password is incorrect",
                        code: "INVALID_OLD_PASSWORD",
                      },
                    },
                  },
                  notAuthenticated: {
                    $ref: "#/components/responses/UnauthorizedError",
                  },
                },
              },
            },
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
    "/api/v1/users/events": {
      get: {
        tags: ["Events"],
        summary: "Get user registered events",
        description: `
Get all events the user has registered for as an attendee.

**Returns:**
Array of events with:
- Complete event details (title, description, dates, location, etc.)
- Organizer information (id, name, email)
- Registration timestamp

**Sorting:** Events are ordered by registration date (most recent first)

**Use Cases:**
- View all events user is attending
- Track registration history
- Display in user dashboard
        `,
        operationId: "getUserEvents",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "User events retrieved successfully",
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
                  message: "User events retrieved successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 65,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  data: [
                    {
                      id: "event-123",
                      title: "Tech Conference 2024",
                      description: "Annual tech conference",
                      startDate: "2024-06-01T09:00:00.000Z",
                      endDate: "2024-06-01T17:00:00.000Z",
                      location: "Convention Center",
                      category: "Technology",
                      price: 99.99,
                      organizer: {
                        id: "org-123",
                        name: "Event Organizer",
                        email: "organizer@example.com",
                      },
                      registeredAt: "2024-01-01T00:00:00.000Z",
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
    "/api/v1/users/organized-events": {
      get: {
        tags: ["Events"],
        summary: "Get organized events",
        description: `
Get all events organized by the current user (where user is the organizer).

**Returns:**
Array of events with:
- Complete event details (title, description, dates, location, etc.)
- List of attendees for each event
  - Attendee user information (id, name, email)
  - Registration timestamps
- Attendee count per event

**Sorting:** Events are ordered by start date (most recent first)

**Use Cases:**
- Manage organized events
- View attendee lists
- Track event registrations
- Display in organizer dashboard
        `,
        operationId: "getOrganizedEvents",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Organized events retrieved successfully",
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
                  message: "Organized events retrieved successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 85,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  data: [
                    {
                      id: "event-123",
                      title: "Tech Conference 2024",
                      description: "Annual tech conference",
                      startDate: "2024-06-01T09:00:00.000Z",
                      endDate: "2024-06-01T17:00:00.000Z",
                      location: "Convention Center",
                      category: "Technology",
                      price: 99.99,
                      attendees: [
                        {
                          id: "user-123",
                          name: "John Doe",
                          email: "john@example.com",
                          registeredAt: "2024-01-01T00:00:00.000Z",
                        },
                      ],
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
  },
};

const options: swaggerJSDoc.Options = {
  definition: swaggerDefinition,
  apis: [], // We're defining everything inline, no need to scan files
};

export const swaggerSpec = swaggerJSDoc(options);
