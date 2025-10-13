export const authPaths = {
  "/user/auth/register": {
    post: {
      summary: "Register a new user",
      tags: ["Auth"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                email: { type: "string", example: "user@example.com" },
                username: { type: "string", example: "john_doe" },
                password: { type: "string", example: "securePassword123" },
                gender: { type: "string", example: "male" },
              },
              required: ["email", "password"],
            },
          },
        },
      },
      responses: {
        201: {
          description: "User created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "User created successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      email: { type: "string" },
                      name: { type: "string" },
                      role: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description:
            "Email and password are required / Failed to create user",
        },
        409: { description: "A user with this email already exists" },
        500: { description: "Internal server error" },
      },
    },
  },
  "/user/auth/login": {
    post: {
      summary: "Login a user",
      tags: ["Auth"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                email: { type: "string", example: "user@example.com" },
                password: { type: "string", example: "securePassword123" },
              },
              required: ["email", "password"],
            },
          },
        },
      },
      responses: {
        201: {
          description: "User login successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    example: "success",
                  },
                  message: {
                    type: "string",
                    example: "User login successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      email: { type: "string" },
                      name: { type: "string" },
                      role: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Email and password are required",
          401: { description: "Invalid credentials" },
          500: { description: "Internal server error" },
        },
      },
    },
  },
  "/user/auth/logout": {
    post: {
      summary: "Logout a user",
      tags: ["Auth"],
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        200: {
          description: "Logged out successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "Logged out successfully",
                  },
                },
              },
            },
          },
        },
        401: { description: "User not authenticated" },
        500: { description: "Logout failed." },
      },
    },
  },
};
