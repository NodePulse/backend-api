import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import type { Express } from "express"; // Import type for file object

const BUCKET_NAME = process.env.R2_BUCKET!;

// Initialize the S3 Client for Cloudflare R2
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * Uploads a file to a Cloudflare R2 bucket.
 * @param {Express.Multer.File} file - The file object from multer (req.file).
 * @returns {Promise<string>} The public URL of the uploaded file.
 */
export const uploadFileToR2 = async (file: Express.Multer.File): Promise<string> => {
  // 1. FIX: Make the filename unique to prevent overwrites
  const fileKey = `events/${Date.now()}-${file.originalname}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  try {
    // 2. FIX: Add a try...catch block for robust error handling
    await s3.send(command);

    // 3. FIX: Use a dedicated public URL environment variable for robustness
    // This is the public URL of your R2 bucket, which you set in your Cloudflare dashboard.
    const baseUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");
    const publicUrl = `${baseUrl}/${fileKey}`;
    return publicUrl;
    
  } catch (error) {
    console.error("Error uploading file to R2:", error);
    // Re-throw the error to be caught by the controller
    throw new Error("Failed to upload file.");
  }
};

export const deleteFromS3 = async (imageUrl: string) => {
  try {
    if (!imageUrl || !imageUrl.includes(BUCKET_NAME)) return;

    const key = new URL(imageUrl).pathname.substring(1);

    // Optional: check if object exists before deletion
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
      console.log("Object exists, deleting now...");
    } catch {
      console.log("Object does not exist. Skipping deletion.");
      return;
    }

    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    console.log("Delete command sent successfully");
  } catch (err) {
    console.error("Error in deleteFromS3:", err);
  }
};

