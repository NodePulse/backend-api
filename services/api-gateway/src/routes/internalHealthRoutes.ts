import express from "express";
import axios from "axios";
import { env } from "../config/env.js";

const internalHealthRouter = express.Router();

internalHealthRouter.get("/auth", async (req, res) => {
  try {
    const response = await axios.get(`${env.AUTH_SERVICE_URL}/health`, {
      headers: {
        Origin: env.API_GATEWAY_URL, // This matches the allowed CORS origin in Auth Service
      },
    });

    res.json({
      service: "auth-service",
      status: "healthy",
      data: response.data,
    });
  } catch (error: any) {
    res.status(500).json({
      service: "auth-service",
      status: "unreachable",
      error: error.message,
    });
  }
});

export default internalHealthRouter;
