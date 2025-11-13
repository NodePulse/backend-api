import { createLogger, format, transports } from "winston";
import { uploadFileToR2, deleteFromS3 } from "../utils/uploadUtils.js";
import { ResponseBuilder, type ServiceResponse } from "../utils/responseBuilder.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

/**
 * Upload a file
 */
export const uploadFile = async (
  requestId: string,
  data: any
): Promise<ServiceResponse> => {
  const builder = new ResponseBuilder(requestId);

  try {
    const { fileBuffer, fileName, mimeType, folder } = data;

    if (!fileBuffer || !fileName || !mimeType) {
      return builder
        .status(400)
        .withError("File buffer, filename, and MIME type are required")
        .build();
    }

    // Convert base64 to buffer if needed
    let buffer: Buffer;
    if (typeof fileBuffer === "string") {
      buffer = Buffer.from(fileBuffer, "base64");
    } else if (Buffer.isBuffer(fileBuffer)) {
      buffer = fileBuffer;
    } else {
      return builder
        .status(400)
        .withError("Invalid file buffer format")
        .build();
    }

    const url = await uploadFileToR2(buffer, fileName, mimeType, folder);

    logger.info("File uploaded successfully", { requestId, url });
    return builder.status(200).withData({ url }).build();
  } catch (error: any) {
    logger.error("File upload failed", { requestId, error });
    return builder
      .status(500)
      .withError("Upload failed", undefined, error.message)
      .build();
  }
};

/**
 * Delete a file
 */
export const deleteFile = async (
  requestId: string,
  data: any
): Promise<ServiceResponse> => {
  const builder = new ResponseBuilder(requestId);

  try {
    const { url } = data;

    if (!url) {
      return builder
        .status(400)
        .withError("URL is required")
        .build();
    }

    await deleteFromS3(url);

    logger.info("File deleted successfully", { requestId, url });
    return builder.status(200).withData({ message: "File deleted successfully" }).build();
  } catch (error: any) {
    logger.error("File deletion failed", { requestId, error });
    return builder
      .status(500)
      .withError("Delete failed", undefined, error.message)
      .build();
  }
};

