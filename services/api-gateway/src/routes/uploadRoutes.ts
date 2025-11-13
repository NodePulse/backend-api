import { Router, type Request, type Response } from "express";
import crypto from "crypto";
// @ts-ignore - multer types issue with ES modules
import multer from "multer";
import { extractToken, type AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { ResponseBuilder } from "../utils/responseBuilder.js";
import { uploadFileToR2, deleteFromS3 } from "../utils/uploadUtils.js";
import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const uploadRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Apply token extraction middleware
uploadRouter.use(extractToken);

/**
 * POST /api/v1/upload
 * Upload a file
 */
uploadRouter.post("/", upload.single("file"), async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    if (!req.file) {
      builder
        .status(400)
        .withMessage("No file provided")
        .withError("No file provided")
        .withRequestContext({ method: req.method, url: req.originalUrl });
      return res.status(400).json(builder.build());
    }

    const folder = (req.body.folder as string) || "uploads";

    try {
      const url = await uploadFileToR2(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        folder
      );

      builder
        .status(200)
        .withMessage("File uploaded successfully")
        .withData({ url })
        .withRequestContext({ method: req.method, url: req.originalUrl });

      res.status(200).json(builder.build());
    } catch (error: any) {
      logger.error("File upload failed", { requestId, error });
      builder
        .status(500)
        .withMessage("File upload failed")
        .withError(error.message)
        .withRequestContext({ method: req.method, url: req.originalUrl });
      res.status(500).json(builder.build());
    }
  } catch (error: any) {
    logger.error("Error in upload route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

/**
 * DELETE /api/v1/upload
 * Delete a file
 */
uploadRouter.delete("/", async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const builder = new ResponseBuilder(requestId);

  try {
    const { url } = req.body;

    if (!url) {
      builder
        .status(400)
        .withMessage("URL is required")
        .withError("URL is required")
        .withRequestContext({ method: req.method, url: req.originalUrl });
      return res.status(400).json(builder.build());
    }

    try {
      await deleteFromS3(url);

      builder
        .status(200)
        .withMessage("File deleted successfully")
        .withData({ message: "File deleted successfully" })
        .withRequestContext({ method: req.method, url: req.originalUrl });

      res.status(200).json(builder.build());
    } catch (error: any) {
      logger.error("File deletion failed", { requestId, error });
      builder
        .status(500)
        .withMessage("File deletion failed")
        .withError(error.message)
        .withRequestContext({ method: req.method, url: req.originalUrl });
      res.status(500).json(builder.build());
    }
  } catch (error: any) {
    logger.error("Error in delete file route", { error, requestId });
    builder
      .status(500)
      .withMessage("Internal server error")
      .withError(error.message)
      .withRequestContext({ method: req.method, url: req.originalUrl });
    res.status(500).json(builder.build());
  }
});

export default uploadRouter;

