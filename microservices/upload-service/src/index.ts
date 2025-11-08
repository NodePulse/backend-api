import type { Express, Request, Response } from "express";
import multer from "multer";
import { uploadFileToR2, deleteFromS3 } from "../../shared/utils/uploadUtils.js";
import { createApp } from "../../shared/utils/appSetup.js";
import { env } from "../../shared/config/env.js";

const PORT = env.PORT || 3006;
const upload = multer({ storage: multer.memoryStorage() });

// Create and configure the Express app
createApp({
  serviceName: "Upload Service",
  port: PORT,
  routes: (app: Express) => {
    app.post("/api/v1/upload", upload.single("file"), async (req: Request, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }
      try {
        const url = await uploadFileToR2(req.file);
        return res.status(200).json({ url });
      } catch (error) {
        return res.status(500).json({ error: "Upload failed" });
      }
    });

    app.delete("/api/v1/upload", async (req: Request, res: Response) => {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      try {
        await deleteFromS3(url);
        return res.status(200).json({ message: "File deleted successfully" });
      } catch (error) {
        return res.status(500).json({ error: "Delete failed" });
      }
    });
  },
});

