import swaggerJSDoc from "swagger-jsdoc";
import { env } from "../../shared/config/env";

const swaggerDefinition: swaggerJSDoc.OAS3Definition = {
  openapi: "3.0.0",
  info: {
    title: "Auth Service API",
    version: "1.0.0",
    description: `
# Authentication Service API Documentation

This API provides comprehensive authentication and user management functionality.

## Overview
The Auth Service handles user registration, login, logout, password management, and OTP-based password reset functionality.

## Authentication
Most endpoints require authentication via JWT token stored in an HTTP-only cookie named \`token\`. 
The token is automatically set when you register or login, and is valid for 24 hours.

## Base URL
- **Development**: http://localhost:3001
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
      url: `http://localhost:${env.PORT || 3001}`,
      description: "Development server",
    },
    {
      url: "https://api.example.com",
      description: "Production server (example)",
    },
  ],
  tags: [
    {
      name: "Authentication",
      description: "User authentication endpoints (register, login, logout)",
    },
    {
      name: "User Profile",
      description: "User profile management endpoints",
    },
    {
      name: "Password Management",
      description: "Password change and reset functionality",
    },
    {
      name: "OTP",
      description: "One-Time Password (OTP) operations for password reset",
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
        required: ["id", "email", "username", "gender", "role", "createdAt", "updatedAt"],
      },
      // Register Request
      RegisterRequest: {
        type: "object",
        required: ["email", "username", "password", "gender"],
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "Valid email address (will be converted to lowercase)",
            example: "user@example.com",
          },
          username: {
            type: "string",
            description:
              "Unique username. Must be 3-50 characters, contain only letters, numbers, and underscores",
            example: "johndoe",
            minLength: 3,
            maxLength: 50,
            pattern: "^[a-zA-Z0-9_]+$",
          },
          password: {
            type: "string",
            description:
              "Password must be 8-20 characters, contain at least one lowercase letter, one uppercase letter, and one digit. Special characters @$!%*?& are allowed.",
            example: "SecurePass123",
            minLength: 8,
            maxLength: 20,
            pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]*$",
          },
          gender: {
            type: "string",
            enum: ["Male", "Female", "Other"],
            description: "User's gender",
            example: "Male",
          },
        },
        example: {
          email: "user@example.com",
          username: "johndoe",
          password: "SecurePass123",
          gender: "Male",
        },
      },
      // Login Request
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "User's email address",
            example: "user@example.com",
          },
          password: {
            type: "string",
            description: "User's password (8-20 characters)",
            example: "SecurePass123",
            minLength: 8,
            maxLength: 20,
          },
        },
        example: {
          email: "user@example.com",
          password: "SecurePass123",
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
      // Forgot Password Request
      ForgotPasswordRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "Email address associated with the account",
            example: "user@example.com",
          },
        },
        example: {
          email: "user@example.com",
        },
      },
      // Verify OTP Request
      VerifyOtpRequest: {
        type: "object",
        required: ["email", "otp"],
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "Email address used to request OTP",
            example: "user@example.com",
          },
          otp: {
            type: "string",
            description: "6-digit OTP code received via email",
            example: "123456",
            pattern: "^\\d{6}$",
            minLength: 6,
            maxLength: 6,
          },
        },
        example: {
          email: "user@example.com",
          otp: "123456",
        },
      },
      // Change Forgot Password Request
      ChangeForgotPasswordRequest: {
        type: "object",
        required: ["email", "otp", "newPassword", "confirmPassword"],
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "Email address used to request OTP",
            example: "user@example.com",
          },
          otp: {
            type: "string",
            description: "6-digit OTP code received via email",
            example: "123456",
            pattern: "^\\d{6}$",
            minLength: 6,
            maxLength: 6,
          },
          newPassword: {
            type: "string",
            description:
              "New password. Must be 8-20 characters, contain at least one lowercase, one uppercase, and one digit.",
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
          email: "user@example.com",
          otp: "123456",
          newPassword: "NewSecurePass123",
          confirmPassword: "NewSecurePass123",
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
            properties: {
              message: {
                type: "string",
                description: "Error message",
              },
              code: {
                type: "string",
                description: "Error code (see Error Codes section)",
              },
              details: {
                type: "array",
                description: "Validation error details",
                items: {
                  type: "object",
                  properties: {
                    field: {
                      type: "string",
                      description: "Field name with validation error",
                    },
                    issue: {
                      type: "string",
                      description: "Description of the validation issue",
                    },
                    path: {
                      type: "string",
                      description: "JSON path to the field",
                    },
                  },
                },
              },
            },
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
                    path: {
                      type: "string",
                      example: "email",
                    },
                  },
                },
              },
            },
          },
        },
      },
      // User with Token (for register/login responses)
      UserWithToken: {
        allOf: [
          { $ref: "#/components/schemas/User" },
          {
            type: "object",
            properties: {
              token: {
                type: "string",
                description:
                  "JWT token (also set as HTTP-only cookie). Valid for 24 hours.",
                example:
                  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyM2U0NTY3LWU4OWItMTJkMy1hNDU2LTQyNjYxNDE3NDAwMCIsImlhdCI6MTYwOTQ1NjgwMCwiZXhwIjoxNjA5NTQzMjAwfQ.signature",
              },
            },
          },
        ],
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
              message: "Not authorized, invalid token format",
              timestamp: "2024-01-01T00:00:00.000Z",
              responseTimeMs: 12,
              requestId: "123e4567-e89b-12d3-a456-426614174000",
              locale: "en-US",
              error: {
                message: "Not authorized, invalid token format",
                code: "TOKEN_INVALID",
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
                    path: "email",
                  },
                  {
                    field: "password",
                    issue: "Password must be at least 8 characters long",
                    path: "password",
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
              message: "User already exists",
              timestamp: "2024-01-01T00:00:00.000Z",
              responseTimeMs: 15,
              requestId: "123e4567-e89b-12d3-a456-426614174000",
              locale: "en-US",
              error: {
                message: "User already exists",
                code: "USER_EXISTS",
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
                message: "Failed to register user",
                code: "REGISTRATION_ERROR",
              },
            },
          },
        },
      },
    },
  },
  paths: {
    "/api/v1/auth/users/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a new user",
        description: `
Register a new user account. Upon successful registration:
- User account is created in the database
- A JWT token is generated and set as an HTTP-only cookie
- User profile image is automatically generated based on gender and username
- Default role is set to "USER"

**Important Notes:**
- Email must be unique (not already registered)
- Username must be unique (not already taken)
- Password must meet complexity requirements
- Username can only contain letters, numbers, and underscores
- Email is automatically converted to lowercase
        `,
        operationId: "register",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RegisterRequest",
              },
              examples: {
                valid: {
                  summary: "Valid registration",
                  value: {
                    email: "john.doe@example.com",
                    username: "johndoe",
                    password: "SecurePass123",
                    gender: "Male",
                  },
                },
                invalidEmail: {
                  summary: "Invalid email format",
                  value: {
                    email: "notanemail",
                    username: "johndoe",
                    password: "SecurePass123",
                    gender: "Male",
                  },
                },
                weakPassword: {
                  summary: "Password doesn't meet requirements",
                  value: {
                    email: "john.doe@example.com",
                    username: "johndoe",
                    password: "weak",
                    gender: "Male",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "User registered successfully",
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
                  message: "User registered successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 125,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  data: {
                    id: "123e4567-e89b-12d3-a456-426614174000",
                    email: "john.doe@example.com",
                    username: "johndoe",
                    gender: "Male",
                    role: "USER",
                    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=johndoe",
                    createdAt: "2024-01-01T00:00:00.000Z",
                    updatedAt: "2024-01-01T00:00:00.000Z",
                    token:
                      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyM2U0NTY3LWU4OWItMTJkMy1hNDU2LTQyNjYxNDE3NDAwMCIsImlhdCI6MTYwOTQ1NjgwMCwiZXhwIjoxNjA5NTQzMjAwfQ.signature",
                  },
                },
              },
            },
            headers: {
              "Set-Cookie": {
                description:
                  "HTTP-only cookie containing JWT token. Valid for 24 hours.",
                schema: {
                  type: "string",
                  example: "token=eyJhbGci...; HttpOnly; SameSite=Lax; Max-Age=86400",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "409": {
            $ref: "#/components/responses/ConflictError",
          },
          "500": {
            $ref: "#/components/responses/ServerError",
          },
        },
      },
    },
    "/api/v1/auth/users/login": {
      post: {
        tags: ["Authentication"],
        summary: "Log in a user",
        description: `
Authenticate a user with email and password. Upon successful login:
- JWT token is generated and set as an HTTP-only cookie
- Token is valid for 24 hours
- User data is returned in the response

**Security Notes:**
- Invalid credentials return the same error message to prevent user enumeration
- Passwords are hashed and never returned in responses
- Token is stored in HTTP-only cookie for security
        `,
        operationId: "login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginRequest",
              },
              examples: {
                valid: {
                  summary: "Valid login",
                  value: {
                    email: "user@example.com",
                    password: "SecurePass123",
                  },
                },
                invalidEmail: {
                  summary: "Invalid email format",
                  value: {
                    email: "notanemail",
                    password: "SecurePass123",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User logged in successfully",
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
                  message: "User logged in successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 85,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  data: {
                    id: "123e4567-e89b-12d3-a456-426614174000",
                    email: "user@example.com",
                    username: "johndoe",
                    name: "John Doe",
                    gender: "Male",
                    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=johndoe",
                    role: "USER",
                    createdAt: "2024-01-01T00:00:00.000Z",
                    updatedAt: "2024-01-01T00:00:00.000Z",
                    token:
                      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyM2U0NTY3LWU4OWItMTJkMy1hNDU2LTQyNjYxNDE3NDAwMCIsImlhdCI6MTYwOTQ1NjgwMCwiZXhwIjoxNjA5NTQzMjAwfQ.signature",
                  },
                },
              },
            },
            headers: {
              "Set-Cookie": {
                description:
                  "HTTP-only cookie containing JWT token. Valid for 24 hours.",
                schema: {
                  type: "string",
                  example: "token=eyJhbGci...; HttpOnly; SameSite=Lax; Max-Age=86400",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            description: "Invalid credentials",
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
                  message: "Invalid credentials",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 45,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  error: {
                    message: "Invalid credentials",
                    code: "INVALID_CREDENTIALS",
                  },
                },
              },
            },
          },
          "500": {
            $ref: "#/components/responses/ServerError",
          },
        },
      },
    },
    "/api/v1/auth/users/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Log out a user",
        description: `
Log out the currently authenticated user. This endpoint:
- Clears the authentication cookie
- Invalidates the session on the client side
- Does not invalidate the JWT token server-side (stateless authentication)

**Note:** Since JWT tokens are stateless, the token remains valid until it expires. 
For enhanced security, consider implementing token blacklisting.
        `,
        operationId: "logout",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Logged out successfully",
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
                  message: "Logged out successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 12,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  data: null,
                },
              },
            },
            headers: {
              "Set-Cookie": {
                description: "Cookie is cleared (expires immediately)",
                schema: {
                  type: "string",
                  example: "token=; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
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
    "/api/v1/auth/users/me": {
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
        operationId: "getMe",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "User details fetched successfully",
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
                  message: "User details fetched successfully",
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
                    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=johndoe",
                    role: "USER",
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
          "500": {
            $ref: "#/components/responses/ServerError",
          },
        },
      },
    },
    "/api/v1/auth/users/change-password": {
      post: {
        tags: ["Password Management"],
        summary: "Change password (authenticated user)",
        description: `
Change the password for the currently authenticated user. This endpoint:
- Requires the current password for verification
- Validates that the new password meets complexity requirements
- Ensures the new password is different from the old password
- Updates the password hash in the database

**Password Requirements:**
- Must be 8-20 characters
- Must contain at least one lowercase letter
- Must contain at least one uppercase letter
- Must contain at least one digit
- Can include special characters: @$!%*?&
- Must be different from the current password
        `,
        operationId: "changePassword",
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
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password updated successfully",
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
                  message: "Password updated successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 95,
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
            description: "User not found",
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
                  responseTimeMs: 30,
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
          "500": {
            $ref: "#/components/responses/ServerError",
          },
        },
      },
    },
    "/api/v1/auth/users/forgot-password": {
      post: {
        tags: ["OTP", "Password Management"],
        summary: "Request password reset OTP",
        description: `
Request a One-Time Password (OTP) to reset a forgotten password. This endpoint:
- Generates a 6-digit OTP
- Sends it via email to the provided email address
- Stores the hashed OTP in the database with a 1-minute expiration
- Returns success even if email doesn't exist (to prevent user enumeration)

**Security Features:**
- OTP expires after 1 minute
- Only one active OTP per email (previous OTPs are deleted)
- OTP is hashed before storage
- Response doesn't reveal if email exists

**Email Format:**
The OTP email contains:
- Subject: "Password Reset OTP"
- Body: "Your OTP is [6-digit-code]. It expires in 1 minute."
        `,
        operationId: "forgotPassword",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ForgotPasswordRequest",
              },
              examples: {
                valid: {
                  summary: "Valid request",
                  value: {
                    email: "user@example.com",
                  },
                },
                invalidEmail: {
                  summary: "Invalid email format",
                  value: {
                    email: "notanemail",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "OTP sent successfully (always returns success to prevent enumeration)",
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
                  message: "OTP sent successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 250,
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
          "500": {
            description: "Failed to send OTP (email service error)",
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
                  message: "Failed to send OTP",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 120,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  error: {
                    message: "Failed to send OTP",
                    code: "OTP_SEND_ERROR",
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/users/verify-otp": {
      post: {
        tags: ["OTP"],
        summary: "Verify password reset OTP",
        description: `
Verify the OTP code received via email. This endpoint:
- Validates the OTP format (6 digits)
- Checks if OTP exists and hasn't expired (1 minute validity)
- Verifies the OTP matches the stored hash
- Does NOT reset the password (use change-forgot-password for that)

**Use Case:**
This endpoint is typically used to verify the OTP before allowing the user to proceed with password reset in the UI.

**OTP Validity:**
- OTP expires 1 minute after generation
- Only the most recent OTP for an email is valid
- Previous OTPs are automatically deleted when a new one is generated
        `,
        operationId: "verifyOTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/VerifyOtpRequest",
              },
              examples: {
                valid: {
                  summary: "Valid OTP",
                  value: {
                    email: "user@example.com",
                    otp: "123456",
                  },
                },
                invalidFormat: {
                  summary: "Invalid OTP format",
                  value: {
                    email: "user@example.com",
                    otp: "12345",
                  },
                },
                expired: {
                  summary: "Expired OTP",
                  value: {
                    email: "user@example.com",
                    otp: "123456",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "OTP verified successfully",
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
                  message: "OTP verified successfully",
                  timestamp: "2024-01-01T00:00:00.000Z",
                  responseTimeMs: 35,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  data: null,
                },
              },
            },
          },
          "400": {
            description: "Invalid OTP or OTP expired",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                examples: {
                  invalidOtp: {
                    summary: "Invalid OTP",
                    value: {
                      success: false,
                      status: {
                        code: 400,
                        description: "Bad Request",
                      },
                      message: "Invalid OTP",
                      timestamp: "2024-01-01T00:00:00.000Z",
                      responseTimeMs: 25,
                      requestId: "123e4567-e89b-12d3-a456-426614174000",
                      locale: "en-US",
                      error: {
                        message: "Invalid OTP",
                        code: "INVALID_OTP",
                      },
                    },
                  },
                  expiredOtp: {
                    summary: "Expired OTP",
                    value: {
                      success: false,
                      status: {
                        code: 400,
                        description: "Bad Request",
                      },
                      message: "OTP expired or not found",
                      timestamp: "2024-01-01T00:00:00.000Z",
                      responseTimeMs: 20,
                      requestId: "123e4567-e89b-12d3-a456-426614174000",
                      locale: "en-US",
                      error: {
                        message: "OTP expired or not found",
                        code: "OTP_EXPIRED",
                      },
                    },
                  },
                  validationError: {
                    $ref: "#/components/responses/ValidationError",
                  },
                },
              },
            },
          },
          "500": {
            $ref: "#/components/responses/ServerError",
          },
        },
      },
    },
    "/api/v1/auth/users/change-forgot-password": {
      post: {
        tags: ["OTP", "Password Management"],
        summary: "Reset password using OTP",
        description: `
Reset a forgotten password using the OTP received via email. This endpoint:
- Verifies the OTP is valid and not expired
- Validates the new password meets requirements
- Updates the password hash in the database
- Deletes the used OTP to prevent reuse

**Password Requirements:**
- Must be 8-20 characters
- Must contain at least one lowercase letter
- Must contain at least one uppercase letter
- Must contain at least one digit
- Can include special characters: @$!%*?&

**Process Flow:**
1. User requests OTP via \`/forgot-password\`
2. User receives OTP via email
3. (Optional) User verifies OTP via \`/verify-otp\`
4. User resets password via this endpoint with OTP and new password

**Security:**
- OTP can only be used once
- OTP expires after 1 minute
- Password is hashed before storage
        `,
        operationId: "changeForgotPassword",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ChangeForgotPasswordRequest",
              },
              examples: {
                valid: {
                  summary: "Valid password reset",
                  value: {
                    email: "user@example.com",
                    otp: "123456",
                    newPassword: "NewSecurePass123",
                    confirmPassword: "NewSecurePass123",
                  },
                },
                passwordsMismatch: {
                  summary: "Passwords don't match",
                  value: {
                    email: "user@example.com",
                    otp: "123456",
                    newPassword: "NewSecurePass123",
                    confirmPassword: "DifferentPass123",
                  },
                },
                weakPassword: {
                  summary: "Password doesn't meet requirements",
                  value: {
                    email: "user@example.com",
                    otp: "123456",
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
                  responseTimeMs: 110,
                  requestId: "123e4567-e89b-12d3-a456-426614174000",
                  locale: "en-US",
                  data: null,
                },
              },
            },
          },
          "400": {
            description: "Invalid input, invalid OTP, or OTP expired",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                examples: {
                  invalidOtp: {
                    summary: "Invalid OTP",
                    value: {
                      success: false,
                      status: {
                        code: 400,
                        description: "Bad Request",
                      },
                      message: "Invalid OTP",
                      timestamp: "2024-01-01T00:00:00.000Z",
                      responseTimeMs: 30,
                      requestId: "123e4567-e89b-12d3-a456-426614174000",
                      locale: "en-US",
                      error: {
                        message: "Invalid OTP",
                        code: "INVALID_OTP",
                      },
                    },
                  },
                  expiredOtp: {
                    summary: "Expired OTP",
                    value: {
                      success: false,
                      status: {
                        code: 400,
                        description: "Bad Request",
                      },
                      message: "OTP expired",
                      timestamp: "2024-01-01T00:00:00.000Z",
                      responseTimeMs: 25,
                      requestId: "123e4567-e89b-12d3-a456-426614174000",
                      locale: "en-US",
                      error: {
                        message: "OTP expired",
                        code: "OTP_EXPIRED",
                      },
                    },
                  },
                  validationError: {
                    $ref: "#/components/responses/ValidationError",
                  },
                },
              },
            },
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

