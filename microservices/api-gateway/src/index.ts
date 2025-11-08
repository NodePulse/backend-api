import express from "express";
import type { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createLogger, format, transports } from "winston";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import { env } from "../shared/config/env.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const app = express();
const PORT = env.PORT || 8087;

const corsOrigins = [env.CLIENT_URL, "http://localhost:3000"];
const corsOptions: CorsOptions = {
  origin: corsOrigins,
  credentials: true,
};

app.use(compression());
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

// Service URLs
const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const USER_SERVICE = process.env.USER_SERVICE_URL || "http://localhost:3002";
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || "http://localhost:3003";
const TRANSACTION_SERVICE = process.env.TRANSACTION_SERVICE_URL || "http://localhost:3004";
const ADMIN_SERVICE = process.env.ADMIN_SERVICE_URL || "http://localhost:3005";
const UPLOAD_SERVICE = process.env.UPLOAD_SERVICE_URL || "http://localhost:3006";

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "api-gateway" });
});

// Proxy middleware configuration
const proxyOptions = {
  changeOrigin: true,
  cookieDomainRewrite: "localhost",
  onProxyReq: (proxyReq: any, req: Request) => {
    logger.info("Proxying request", {
      method: req.method,
      url: req.originalUrl,
      target: proxyReq.path,
    });
  },
  onError: (err: Error, req: Request, res: Response) => {
    logger.error("Proxy error", {
      error: err.message,
      url: req.originalUrl,
    });
    res.status(500).json({ error: "Service unavailable" });
  },
};

// Route proxies
app.use("/api/v1/auth/users", createProxyMiddleware({
  ...proxyOptions,
  target: AUTH_SERVICE,
  pathRewrite: { "^/api/v1": "" },
}));

app.use("/api/v1/users", createProxyMiddleware({
  ...proxyOptions,
  target: USER_SERVICE,
  pathRewrite: { "^/api/v1": "" },
}));

app.use("/api/v1/events", createProxyMiddleware({
  ...proxyOptions,
  target: EVENT_SERVICE,
  pathRewrite: { "^/api/v1": "" },
}));

app.use("/api/v1/transactions", createProxyMiddleware({
  ...proxyOptions,
  target: TRANSACTION_SERVICE,
  pathRewrite: { "^/api/v1": "" },
}));

app.use("/api/v1/auth/admins", createProxyMiddleware({
  ...proxyOptions,
  target: ADMIN_SERVICE,
  pathRewrite: { "^/api/v1": "" },
}));

app.use("/api/v1/upload", createProxyMiddleware({
  ...proxyOptions,
  target: UPLOAD_SERVICE,
  pathRewrite: { "^/api/v1": "" },
}));

app.listen(PORT, () => {
  logger.info(`API Gateway running`, {
    environment: env.NODE_ENV,
    port: PORT,
    url: `http://localhost:${PORT}`,
  });
});

