import crypto from "crypto";
import { createLogger, format, transports } from "winston";
import { STATUS_MESSAGES } from "../constants/statusCodes.js";
import { env } from "../config/env.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

export interface MetaData {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  links?: Record<string, string | null>;
  apiVersion?: string;
  deprecation?: { message: string; sunsetDate?: string };
  [key: string]: any;
}

export interface ErrorResponse {
  message: string;
  code?: string;
  details?: Array<{ field: string; issue: string; path?: string }>;
  stack?: string | undefined;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  status: {
    code: number;
    description: string;
  };
  message: string;
  timestamp: string;
  responseTimeMs: number;
  requestId: string;
  locale: string;
  data?: T | null;
  meta?: MetaData;
  error?: ErrorResponse | null;
  requestContext?: Record<string, any> | null;
}

export class ResponseBuilder {
  private startTime: [number, number];
  private requestId: string;
  private statusCode = 200;
  private message?: string;
  private data: any = null;
  private meta: MetaData = {};
  private error: ErrorResponse | null = null;
  private locale = "en-US";
  private requestContext: Record<string, any> | null = null;
  private encryptionSecret?: string;
  private encryptionAlgorithm = "aes-256-cbc";

  constructor(requestId: string) {
    this.requestId = requestId;
    this.startTime = process.hrtime();
    // Only set encryption secret if encryption is enabled
    this.encryptionSecret = env.ENABLE_ENCRYPTION === false ? env.ENCRYPTION_KEY : undefined;
  }

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  withMessage(message: string): this {
    this.message = message;
    return this;
  }

  withData<T>(data: T): this {
    this.data = data;
    return this;
  }

  withMeta(meta: MetaData): this {
    this.meta = { ...this.meta, ...meta };
    return this;
  }

  withError(message: string, code?: string, details?: Array<{ field: string; issue: string; path?: string }> | any): this {
    this.error = { message, code, details };
    return this;
  }

  withLocale(locale: string): this {
    this.locale = locale;
    return this;
  }

  withRequestContext(context: Record<string, any>): this {
    this.requestContext = context;
    return this;
  }

  /**
   * Encrypts data using AES-256-CBC algorithm
   */
  private encryptData(data: any): any {
    if (!this.encryptionSecret) return data;

    try {
      const salt = env.ENCRYPTION_SALT;
      if (!salt) {
        logger.warn("ENCRYPTION_SALT not provided, encryption skipped", { requestId: this.requestId });
        return data;
      }

      const key = crypto.scryptSync(this.encryptionSecret, salt, 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.encryptionAlgorithm, key, iv);

      const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(data), "utf8"),
        cipher.final(),
      ]);

      return {
        iv: iv.toString("hex"),
        encryptedData: encrypted.toString("hex"),
        salt,
      };
    } catch (error) {
      logger.error("Encryption failed", {
        error,
        requestId: this.requestId,
      });
      // Return unencrypted data if encryption fails
      return data;
    }
  }

  build(): ApiResponse {
    const success = this.statusCode >= 200 && this.statusCode < 300;
    const [seconds, nanoseconds] = process.hrtime(this.startTime);
    const responseTimeMs = Math.round(seconds * 1000 + nanoseconds / 1e6);

    return {
      success,
      status: {
        code: this.statusCode,
        description: STATUS_MESSAGES[this.statusCode] || "Unknown Status",
      },
      message:
        this.message ||
        STATUS_MESSAGES[this.statusCode] ||
        "Request processed.",
      timestamp: new Date().toISOString(),
      responseTimeMs,
      requestId: this.requestId,
      locale: this.locale,
      data:
        this.data !== null
          ? this.encryptionSecret
            ? this.encryptData(this.data)
            : this.data
          : null,
      meta: Object.keys(this.meta).length > 0 ? this.meta : {},
      error: this.error || null,
      requestContext: this.requestContext || null,
    };
  }
}

