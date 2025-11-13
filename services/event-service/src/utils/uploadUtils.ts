import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";

const BUCKET_NAME = env.R2_BUCKET!;

// Initialize the S3 Client for Cloudflare R2
const s3 = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * Uploads a file to a Cloudflare R2 bucket.
 * @param file - The file object from multer (req.file).
 * @param folder - Optional folder path in the bucket (default: "events")
 * @returns The public URL of the uploaded file.
 */
export const uploadFileToR2 = async (
  file: Express.Multer.File,
  folder: string = "events"
): Promise<string> => {
  // Make the filename unique to prevent overwrites
  const fileKey = `${folder}/${Date.now()}-${file.originalname}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  try {
    await s3.send(command);

    // Use a dedicated public URL environment variable for robustness
    const baseUrl = env.R2_PUBLIC_URL?.replace(/\/+$/, "");
    const publicUrl = `${baseUrl}/${fileKey}`;
    return publicUrl;
  } catch (error) {
    console.error("Error uploading file to R2:", error);
    throw new Error("Failed to upload file.");
  }
};

/**
 * Deletes a file from Cloudflare R2 bucket.
 * @param imageUrl - The public URL of the file to delete
 */
export const deleteFromS3 = async (imageUrl: string): Promise<void> => {
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
    throw err;
  }
};

