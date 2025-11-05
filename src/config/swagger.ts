// src/config/swagger.ts
import swaggerJSDoc from "swagger-jsdoc";
import { env } from "./env.js";

const swaggerDefinition: swaggerJSDoc.OAS3Definition = {
  openapi: "3.0.0",
  info: {
    title: "Authentication API",
    version: "1.0.0",
    description: "API for user authentication and management",
  },
  servers: [
    {
      url:
        env.NODE_ENV === "production"
          ? "https://your-api.com"
          : "http://localhost:8085",
      description:
        env.NODE_ENV === "production"
          ? "Production server"
          : "Development server",
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "token",
        description: "JWT token stored in an HTTP-only cookie",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "User ID (cuid)",
            example: "cmh76yqmp0000xs36tg3fmqf4",
          },
          name: {
            type: "string",
            description: "User name",
            nullable: true,
            example: null,
          },
          email: {
            type: "string",
            format: "email",
            description: "User email",
            example: "sachin@antiersolutions.com",
          },
          role: {
            type: "string",
            description: "User role (e.g., USER, ADMIN)",
            example: "USER",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Creation timestamp",
            example: "2025-10-26T04:11:11.569Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            description: "Update timestamp",
            example: "2025-10-26T04:11:11.569Z",
          },
        },
        required: ["id", "email", "role", "createdAt", "updatedAt"],
      },
      ValidationError: {
        type: "object",
        properties: {
          field: {
            type: "string",
            description: "Field that caused the error",
            example: "email",
          },
          issue: {
            type: "string",
            description: "Error message",
            example: "Invalid email address",
          },
        },
        required: ["field", "issue"],
      },
      ErrorDetails: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Error message",
            example: "Error occurred.",
          },
          code: {
            type: "string",
            description: "Error code",
            example: "TOKEN_INVALID",
          },
        },
        required: ["message", "code"],
      },
      RequestContext: {
        type: "object",
        properties: {
          method: {
            type: "string",
            description: "HTTP method",
            example: "POST",
            nullable: true,
          },
          url: {
            type: "string",
            description: "Request URL",
            example: "/api/v1/auth/users/logout",
            nullable: true,
          },
        },
      },
      SuccessResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Request success status",
            example: true,
          },
          status: {
            type: "object",
            properties: {
              code: {
                type: "number",
                description: "HTTP status code",
                example: 200,
              },
              description: {
                type: "string",
                description: "Status description",
                example: "OK",
              },
            },
            required: ["code", "description"],
          },
          message: {
            type: "string",
            description: "Response message",
            example: "User details fetched successfully",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "Response timestamp",
            example: "2025-10-26T06:58:09.268Z",
          },
          responseTimeMs: {
            type: "number",
            description: "Response time in milliseconds",
            example: 1,
          },
          requestId: {
            type: "string",
            description: "Request ID for tracing",
            example: "b2c24596-58d1-40eb-891d-2306131db62c",
            nullable: true,
          },
          locale: {
            type: "string",
            description: "Response locale",
            example: "en-US",
          },
          data: {
            type: "object",
            description: "Response data",
            nullable: true,
          },
          meta: { type: "object", description: "Metadata", example: {} },
          error: {
            type: "null",
            description: "Error details (null for success)",
          },
          requestContext: {
            type: "null",
            description: "Request context (null for success)",
          },
          validationErrors: {
            type: "array",
            items: { $ref: "#/components/schemas/ValidationError" },
            description: "Validation errors, if any",
            nullable: true,
          },
        },
        required: [
          "success",
          "status",
          "message",
          "timestamp",
          "responseTimeMs",
          "locale",
          "meta",
        ],
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Request success status",
            example: false,
          },
          status: {
            type: "object",
            properties: {
              code: {
                type: "number",
                description: "HTTP status code",
                example: 401,
              },
              description: {
                type: "string",
                description: "Status description",
                example: "Unauthorized",
              },
            },
            required: ["code", "description"],
          },
          message: {
            type: "string",
            description: "Error message",
            example: "Not authorized, invalid token format",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "Response timestamp",
            example: "2025-10-26T06:58:50.095Z",
          },
          responseTimeMs: {
            type: "number",
            description: "Response time in milliseconds",
            example: 0,
          },
          requestId: {
            type: "string",
            description: "Request ID for tracing",
            example: "03ebc2b5-eaca-4332-94c7-63f4a4aa36f5",
            nullable: true,
          },
          locale: {
            type: "string",
            description: "Response locale",
            example: "en-US",
          },
          data: {
            type: "null",
            description: "Response data (null for errors)",
          },
          meta: { type: "object", description: "Metadata", example: {} },
          error: {
            $ref: "#/components/schemas/ErrorDetails",
            description: "Error details",
            nullable: true,
          },
          requestContext: {
            $ref: "#/components/schemas/RequestContext",
            description: "Request context",
            nullable: true,
          },
          validationErrors: {
            type: "array",
            items: { $ref: "#/components/schemas/ValidationError" },
            description: "Validation errors, if any",
            nullable: true,
          },
        },
        required: [
          "success",
          "status",
          "message",
          "timestamp",
          "responseTimeMs",
          "locale",
          "meta",
        ],
      },
      RegisterRequest: {
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "User email",
            example: "sachin@antiersolutions.com",
          },
          username: {
            type: "string",
            description: "User username",
            example: "sachin123",
          },
          password: {
            type: "string",
            description: "User password",
            example: "Password123!",
          },
          gender: {
            type: "string",
            enum: ["Male", "Female", "Other"],
            description: "User gender",
            example: "Male",
          },
        },
        required: ["email", "username", "password", "gender"],
      },
      LoginRequest: {
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "User email",
            example: "sachin@antiersolutions.com",
          },
          password: {
            type: "string",
            description: "User password",
            example: "Password123!",
          },
        },
        required: ["email", "password"],
      },
      ChangePasswordRequest: {
        type: "object",
        properties: {
          oldPassword: {
            type: "string",
            description: "Current password",
            example: "OldPassword123!",
          },
          newPassword: {
            type: "string",
            description: "New password",
            example: "NewPassword123!",
          },
          confirmPassword: {
            type: "string",
            description: "Confirm new password",
            example: "NewPassword123!",
          },
        },
        required: ["oldPassword", "newPassword", "confirmPassword"],
      },
      ForgotPasswordRequest: {
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "User email",
            example: "sachin@antiersolutions.com",
          },
        },
        required: ["email"],
      },
      VerifyOtpRequest: {
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "User email",
            example: "sachin@antiersolutions.com",
          },
          otp: {
            type: "string",
            description: "6-digit OTP",
            example: "123456",
          },
        },
        required: ["email", "otp"],
      },
      ChangeForgotPasswordRequest: {
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "User email",
            example: "sachin@antiersolutions.com",
          },
          otp: {
            type: "string",
            description: "6-digit OTP",
            example: "123456",
          },
          newPassword: {
            type: "string",
            description: "New password",
            example: "NewPassword123!",
          },
          confirmPassword: {
            type: "string",
            description: "Confirm new password",
            example: "NewPassword123!",
          },
        },
        required: ["email", "otp", "newPassword", "confirmPassword"],
      },
    },
  },
  paths: {
    "/api/v1/auth/users/register": {
      post: {
        summary: "Register a new user",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "User created successfully with token",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SuccessResponse",
                  example: {
                    success: true,
                    status: { code: 201, description: "Created" },
                    message: "User registered successfully",
                    timestamp: "2025-10-26T06:58:09.268Z",
                    responseTimeMs: 1,
                    requestId: "b2c24596-58d1-40eb-891d-2306131db62c",
                    locale: "en-US",
                    data: {
                      id: "cmh76yqmp0000xs36tg3fmqf4",
                      name: null,
                      email: "sachin@antiersolutions.com",
                      role: "USER",
                      createdAt: "2025-10-26T04:11:11.569Z",
                      updatedAt: "2025-10-26T04:11:11.569Z",
                      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    },
                    meta: {},
                    error: null,
                    requestContext: null,
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  status: { code: 400, description: "Bad Request" },
                  message: "Invalid input provided",
                  timestamp: "2025-10-26T06:58:50.095Z",
                  responseTimeMs: 0,
                  requestId: "03ebc2b5-eaca-4332-94c7-63f4a4aa36f5",
                  locale: "en-US",
                  data: null,
                  meta: {},
                  error: {
                    message: "Invalid input provided",
                    code: "INVALID_INPUT",
                  },
                  requestContext: {
                    method: "POST",
                    url: "/api/v1/auth/users/register",
                  },
                  validationErrors: [
                    { field: "email", issue: "Invalid email address" },
                  ],
                },
              },
            },
          },
          "409": {
            description: "User already exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/users/login": {
      post: {
        summary: "Log in a user",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "User logged in successfully with token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
                example: {
                  success: true,
                  status: { code: 200, description: "OK" },
                  message: "User logged in successfully",
                  timestamp: "2025-10-26T06:58:09.268Z",
                  responseTimeMs: 1,
                  requestId: "b2c24596-58d1-40eb-891d-2306131db62c",
                  locale: "en-US",
                  data: {
                    id: "cmh76yqmp0000xs36tg3fmqf4",
                    name: null,
                    email: "sachin@antiersolutions.com",
                    role: "USER",
                    createdAt: "2025-10-26T04:11:11.569Z",
                    updatedAt: "2025-10-26T04:11:11.569Z",
                    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                  },
                  meta: {},
                  error: null,
                  requestContext: null,
                },
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/users/logout": {
      post: {
        summary: "Log out a user",
        tags: ["Authentication"],
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Logged out successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
                example: {
                  success: true,
                  status: { code: 200, description: "OK" },
                  message: "Logged out successfully",
                  timestamp: "2025-10-26T06:58:09.268Z",
                  responseTimeMs: 1,
                  requestId: "b2c24596-58d1-40eb-891d-2306131db62c",
                  locale: "en-US",
                  data: null,
                  meta: {},
                  error: null,
                  requestContext: null,
                },
              },
            },
          },
          "401": {
            description: "User not authenticated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  status: { code: 401, description: "Unauthorized" },
                  message: "Not authorized, invalid token format",
                  timestamp: "2025-10-26T06:58:50.095Z",
                  responseTimeMs: 0,
                  requestId: "03ebc2b5-eaca-4332-94c7-63f4a4aa36f5",
                  locale: "en-US",
                  data: null,
                  meta: {},
                  error: { message: "Error occurred.", code: "TOKEN_INVALID" },
                  requestContext: {
                    method: "POST",
                    url: "/api/v1/auth/users/logout",
                  },
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/users/me": {
      get: {
        summary: "Get authenticated user details",
        tags: ["Authentication"],
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "User details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
                example: {
                  success: true,
                  status: { code: 200, description: "OK" },
                  message: "User details fetched successfully",
                  timestamp: "2025-10-26T06:58:09.268Z",
                  responseTimeMs: 1,
                  requestId: "b2c24596-58d1-40eb-891d-2306131db62c",
                  locale: "en-US",
                  data: {
                    id: "cmh76yqmp0000xs36tg3fmqf4",
                    name: null,
                    email: "sachin@restaurant.com",
                    role: "USER",
                    createdAt: "2025-10-26T04:11:11.569Z",
                    updatedAt: "2025-10-26T04:11:11.569Z",
                  },
                  meta: {},
                  error: null,
                  requestContext: null,
                },
              },
            },
          },
          "401": {
            description: "User not authenticated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/users/change-password": {
      post: {
        summary: "Change authenticated user's password",
        tags: ["Authentication"],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Password updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "User not authenticated or incorrect old password",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/users/forgot-password": {
      post: {
        summary: "Send password reset OTP",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ForgotPasswordRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "OTP sent successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/users/verify-otp": {
      post: {
        summary: "Verify password reset OTP",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VerifyOtpRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "OTP verified successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          "400": {
            description: "Invalid input or OTP",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/users/change-forgot-password": {
      post: {
        summary: "Change password using OTP",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ChangeForgotPasswordRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password changed successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          "400": {
            description: "Invalid input or OTP",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
};

const options: swaggerJSDoc.Options = {
  definition: swaggerDefinition,
  apis: ["src/controller/*.ts", "src/routes/*.ts"],
};

export const swaggerSpec = swaggerJSDoc(options);
