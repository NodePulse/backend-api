import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";

const BUCKET_NAME = env.R2_BUCKET;

// Initialize the S3 Client for Cloudflare R2
const s3 = BUCKET_NAME && env.R2_ENDPOINT && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY
  ? new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

/**
 * Uploads a file to a Cloudflare R2 bucket.
 * @param fileBuffer - The file buffer (base64 decoded)
 * @param mimetype - The file mimetype
 * @param originalname - The original filename
 * @param folder - Optional folder path in the bucket (default: "profiles")
 * @returns The public URL of the uploaded file.
 */
export const uploadFileToR2 = async (
  fileBuffer: Buffer,
  mimetype: string,
  originalname: string,
  folder: string = "profiles"
): Promise<string> => {
  if (!s3 || !BUCKET_NAME) {
    throw new Error("R2 configuration is missing");
  }

  const fileKey = `${folder}/${Date.now()}-${originalname}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: mimetype,
  });

  try {
    await s3.send(command);

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
  if (!s3 || !BUCKET_NAME || !imageUrl || !imageUrl.includes(BUCKET_NAME)) {
    return;
  }

  try {
    const key = new URL(imageUrl).pathname.substring(1);

    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    } catch {
      return;
    }

    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
  } catch (err) {
    console.error("Error in deleteFromS3:", err);
    throw err;
  }
};

