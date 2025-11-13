// src/middleware/encryptResponse.ts
import type { Request, Response, NextFunction } from "express";
import { encryptResponse } from "../utils/encryption";

export function encryptResponseMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = function (body: any) {
    if (body && body.data !== null && body.data !== undefined && res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const encryptedData = encryptResponse(body.data);
        body.data = encryptedData;
      } catch (error) {
        console.error("Response encryption failed:", error);
      }
    }
    return originalJson(body);
  };

  res.send = function (body: any) {
    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body);
        if (parsed && parsed.data !== null && parsed.data !== undefined && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const encryptedData = encryptResponse(parsed.data);
            parsed.data = encryptedData;
            return originalSend(JSON.stringify(parsed));
          } catch (error) {
            console.error("Response encryption failed:", error);
          }
        }
      } catch (e) {
        // Not JSON, send as is
      }
    } else if (body && typeof body === "object" && body.data !== null && body.data !== undefined && res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const encryptedData = encryptResponse(body.data);
        body.data = encryptedData;
      } catch (error) {
        console.error("Response encryption failed:", error);
      }
    }
    return originalSend(body);
  };

  next();
}

