// src/docs/swaggerDef.js
import swaggerJsdoc from "swagger-jsdoc";
import { authPaths } from "./swaggerpaths/authPaths.js";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Event Management API",
      version: "1.0.0",
      description: "API documentation for your event system",
    },
    paths: {
        ...authPaths
    },
    servers: [
    //   {
    //     url: "https://your-render-url.onrender.com/api/v1",
    //     description: "Production server (Render)",
    //   },
      {
        url: "http://localhost:8080/api/v1",
        description: "Local server",
      },
    ],
  },
  apis: ["./src/routes/*.js"], // only scan your routes
};

export const swaggerSpec = swaggerJsdoc(options);
