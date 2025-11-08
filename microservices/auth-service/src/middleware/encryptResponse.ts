import type { Request, Response, NextFunction } from "express";
import { encryptResponse } from "../utils/encryption.js";

/**
 * Middleware to encrypt response data before sending
 * This ensures the network tab shows encrypted data while the client can decrypt it
 * Intercepts res.json() calls to encrypt the data field
 */
export function encryptResponseMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  // Intercept json() method
  res.json = function (body: any) {
    // Only encrypt if there's data and it's a successful response
    if (body && body.data !== null && body.data !== undefined && res.statusCode >= 200 && res.statusCode < 300) {
      try {
        // Encrypt the data field
        const encryptedData = encryptResponse(body.data);
        // Replace data with encrypted string
        body.data = encryptedData;
      } catch (error) {
        console.error("Response encryption failed:", error);
        // If encryption fails, send original response
      }
    }
    return originalJson(body);
  };

  // Also intercept send() method for cases where JSON is sent directly
  res.send = function (body: any) {
    // Try to parse as JSON if it's a string
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

