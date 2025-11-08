// src/utils/responseHandler.ts
import { Response } from "express";
import { createLogger, format, transports } from "winston";
import { STATUS_MESSAGES } from "../constants/statusCodes.js"; // Centralized status codes
import { z } from "zod";
// import { Ajv } from "ajv";
import crypto from "crypto";

// Structured logger setup
const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

// Default data schema (configurable per instance)
const DefaultDataSchema = z.object({}).loose();

// Standardized API response interface
interface ApiResponse<T = unknown> {
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

interface MetaData {
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

interface ErrorResponse {
  message: string;
  code?: string;
  details?: Array<{ field: string; issue: string; path?: string }>;
  stack?: string | undefined;
}

// AJV validator for ApiResponse schema
// const ajv = new Ajv({ strict: false });
// const validateResponse = ajv.compile();

/**
 * Advanced Response Builder (v2) for consistent, traceable, and extensible API responses.
 * Supports status codes, data, metadata, errors, headers, encryption, logging, and middleware.
 */
export class ResponseBuilder {
  private readonly res: Response;
  private readonly startTime: [number, number];
  private readonly crypto: {
    randomUUID: () => string;
    randomBytes: (size: number) => Buffer;
    scryptSync: (password: string, salt: string, keylen: number) => Buffer;
  };
  private readonly dataSchema: z.ZodSchema;
  private requestId: string;
  private statusCode = 200;
  private customMessage?: string;
  private data: any = null;
  private meta: MetaData = {};
  private error: ErrorResponse | null = null;
  private headers: Record<string, string> = {};
  private locale = "en-US";
  private requestContext: Record<string, any> | null = null;
  private enableLogging = false;
  private encryptionSecret?: string;
  private encryptionAlgorithm: string;
  private middleware: Array<(payload: ApiResponse) => void> = [];

  /**
   * Creates a new ResponseBuilder instance with default security headers.
   * @param res - Express Response object
   * @param options - Optional configuration for crypto, schema, and features
   */
  constructor(
    res: Response,
    options: {
      crypto?: {
        randomUUID: () => string;
        randomBytes: (size: number) => Buffer;
        scryptSync: (password: string, salt: string, keylen: number) => Buffer;
      };
      disableFeaturesForTest?: boolean;
      dataSchema?: z.ZodSchema;
      encryptionAlgorithm?: string;
    } = {}
  ) {
    // Validate that res is a valid Express Response object
    if (!res || typeof res.setHeader !== "function" || typeof res.status !== "function" || typeof res.json !== "function") {
      const errorMsg = `Invalid Express Response object provided to ResponseBuilder. Expected object with setHeader, status, and json methods, but got: ${typeof res}`;
      logger.error(errorMsg, {
        resType: typeof res,
        hasSetHeader: typeof res?.setHeader,
        hasStatus: typeof res?.status,
        hasJson: typeof res?.json,
        resKeys: res ? Object.keys(res).slice(0, 10) : [],
      });
      throw new Error(errorMsg);
    }
    
    this.res = res;
    this.startTime = process.hrtime();
    this.crypto = options.crypto || crypto;
    this.requestId = this.crypto.randomUUID();
    this.dataSchema = options.dataSchema || DefaultDataSchema;
    this.encryptionAlgorithm = options.encryptionAlgorithm || "aes-256-cbc";
    if (options.disableFeaturesForTest) {
      this.enableLogging = false;
      this.encryptionSecret = undefined;
    }
    // Set default security headers
    this.withHeader("X-Content-Type-Options", "nosniff");
    this.withHeader("X-Frame-Options", "DENY");
  }

  /**
   * Sets the HTTP status code for the response.
   * @param code - HTTP status code (100-599)
   * @returns this - For method chaining
   * @throws Error if the status code is invalid
   */
  public status(code: number): this {
    if (!Number.isInteger(code) || code < 100 || code > 599) {
      throw new Error(`Invalid HTTP status code: ${code}`);
    }
    this.statusCode = code;
    return this;
  }

  /**
   * Sets a human-readable message for the response.
   * @param message - Custom message
   * @returns this - For method chaining
   */
  public message(message: string): this {
    this.customMessage = message;
    return this;
  }

  /**
   * Attaches response data with schema validation.
   * @param data - The response data to include, validated against the configured schema
   * @returns this - For method chaining
   * @throws Error if the data does not match the schema
   */
  public withData<T>(data: T): this {
    const parsedData = this.dataSchema.safeParse(data);
    if (!parsedData.success) {
      throw new Error(`Invalid data format: ${parsedData.error.message}`);
    }
    this.data = parsedData.data;
    return this;
  }

  /**
   * Adds metadata (e.g., pagination, links, version).
   * @param meta - Metadata object
   * @returns this - For method chaining
   */
  public withMeta(meta: MetaData): this {
    this.meta = { ...this.meta, ...meta };
    return this;
  }

  /**
   * Adds pagination metadata.
   * @param page - Current page number
   * @param limit - Items per page
   * @param total - Total items
   * @returns this - For method chaining
   */
  public withPagination(page: number, limit: number, total: number): this {
    this.meta.pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
    return this;
  }

  /**
   * Adds navigation links to metadata.
   * @param links - Record of link names and URLs
   * @returns this - For method chaining
   */
  public withLinks(links: Record<string, string | null>): this {
    this.meta.links = links;
    return this;
  }

  /**
   * Attaches an error in a standardized format.
   * @param error - Error object or custom error response
   * @returns this - For method chaining
   */
  public withError(error: Error | ErrorResponse): this {
    this.error = {
      message:
        (error as Error).message ||
        (error as ErrorResponse).message ||
        "Error occurred.",
      ...(process.env.NODE_ENV !== "production" && (error as Error).stack
        ? { stack: (error as Error).stack }
        : {}),
      ...((error as ErrorResponse).code
        ? { code: (error as ErrorResponse).code }
        : {}),
      ...((error as ErrorResponse).details
        ? { details: (error as ErrorResponse).details }
        : {}),
    };
    return this;
  }

  /**
   * Attaches validation errors with detailed context.
   * @param errors - Array of validation error details
   * @returns this - For method chaining
   */
  public withValidationErrors(
    errors: Array<{ field: string; issue: string; path?: string }>
  ): this {
    this.error = {
      message: "ValidationError",
      details: errors.map((err) => ({
        field: err.field,
        issue: err.issue,
        path: err.path || err.field,
      })),
    };
    return this;
  }

  /**
   * Adds a frontend-specific error code.
   * @param code - Error code
   * @returns this - For method chaining
   */
  public withErrorCode(code: string): this {
    if (!this.error) this.error = { message: "Error occurred." };
    this.error.code = code;
    return this;
  }

  /**
   * Adds a custom header to the response.
   * @param key - Header key
   * @param value - Header value
   * @returns this - For method chaining
   */
  public withHeader(key: string, value: string): this {
    this.headers[key] = value;
    return this;
  }

  /**
   * Sets the response locale.
   * @param locale - Locale string (e.g., "en-US")
   * @returns this - For method chaining
   */
  public withLocale(locale: string): this {
    this.locale = locale;
    return this;
  }

  /**
   * Includes request context for debugging.
   * @param context - Request context data
   * @returns this - For method chaining
   */
  public withRequestContext(context: Record<string, any>): this {
    this.requestContext = context;
    return this;
  }

  /**
   * Sets a custom request ID for tracing.
   * @param id - Request ID
   * @returns this - For method chaining
   */
  public withRequestId(id: string): this {
    this.requestId = id;
    return this;
  }

  /**
   * Toggles logging for the response.
   * @param enable - Enable or disable logging
   * @returns this - For method chaining
   */
  public withLogging(enable = true): this {
    this.enableLogging = enable;
    return this;
  }

  /**
   * Enables AES encryption for the response data.
   * @param secret - Encryption secret
   * @returns this - For method chaining
   */
  public withEncryption(secret: string): this {
    this.encryptionSecret = secret;
    return this;
  }

  /**
   * Sets the API version in metadata.
   * @param version - API version (e.g., "1.0.0")
   * @returns this - For method chaining
   */
  public withApiVersion(version: string): this {
    this.meta.apiVersion = version;
    return this;
  }

  /**
   * Marks the endpoint as deprecated and adds a warning header.
   * @param reason - Deprecation reason
   * @param sunsetDate - Optional sunset date for the endpoint
   * @returns this - For method chaining
   */
  public deprecated(reason?: string, sunsetDate?: string): this {
    const message = reason || "This endpoint will be removed soon.";
    this.headers["Warning"] = `199 - "Deprecated: ${message}"`;
    this.meta.deprecation = { message, sunsetDate: sunsetDate || "2026-01-01" };
    if (this.enableLogging) {
      logger.warn(`Deprecated endpoint called: ${message}`, {
        requestId: this.requestId,
        method: this.res.req?.method,
        url: this.res.req?.originalUrl,
      });
    }
    return this;
  }

  /**
   * Adds rate-limiting headers.
   * @param limit - Total request limit
   * @param remaining - Remaining requests
   * @param reset - Timestamp for limit reset
   * @returns this - For method chaining
   */
  public withRateLimit(limit: number, remaining: number, reset: number): this {
    this.withHeader("X-RateLimit-Limit", limit.toString());
    this.withHeader("X-RateLimit-Remaining", remaining.toString());
    this.withHeader("X-RateLimit-Reset", reset.toString());
    return this;
  }

  /**
   * Adds middleware to process the response payload.
   * @param middleware - Middleware function to modify payload
   * @returns this - For method chaining
   */
  public withMiddleware(middleware: (payload: ApiResponse) => void): this {
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Encrypts data using the specified algorithm (e.g., AES-256-CBC).
   * @param data - Data to encrypt
   * @returns Encrypted data object
   * @throws Error if encryption fails
   */
  private encryptData(data: any): any {
    if (!this.encryptionSecret) return data;

    try {
      const salt = process.env.ENCRYPTION_SALT;
      if (!salt) {
        throw new Error("ENCRYPTION_SALT environment variable is required");
      }
      const key = this.crypto.scryptSync(this.encryptionSecret, salt, 32);
      const iv = this.crypto.randomBytes(16);
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
        method: this.res.req?.method,
        url: this.res.req?.originalUrl,
      });
      throw new Error("Failed to encrypt response data");
    }
  }

  /**
   * Builds the standardized response payload.
   * @returns The constructed ApiResponse object
   */
  private buildPayload(): ApiResponse {
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
        this.customMessage ||
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

  /**
   * Sends the structured response after validation and middleware processing.
   */
  public send(): void {
    const payload = this.buildPayload();

    // Validate that res is a valid Express Response object
    if (!this.res || typeof this.res.setHeader !== "function") {
      logger.error("Invalid response object in ResponseBuilder", {
        requestId: this.requestId,
        resType: typeof this.res,
        hasSetHeader: typeof this.res?.setHeader,
      });
      throw new Error("Invalid response object: res.setHeader is not a function");
    }

    // Check if headers have already been sent
    if (this.res.headersSent) {
      logger.warn("Headers already sent, skipping header setting", {
        requestId: this.requestId,
        method: this.res.req?.method,
        url: this.res.req?.originalUrl,
      });
      // If headers are already sent, we can't set new ones, but we can still try to send the response
      // However, if headers are sent, the response might have already been sent too
      if (!this.res.writableEnded) {
        this.res.status(this.statusCode).json(payload);
      }
      return;
    }

    // Apply middleware
    this.middleware.forEach((mw) => mw(payload));

    // Validate response
    // if (!validateResponse(payload)) {
    //   logger.error("Invalid response format", {
    //     errors: validateResponse.errors,
    //     requestId: this.requestId,
    //     method: this.res.req?.method,
    //     url: this.res.req?.originalUrl,
    //   });
    //   throw new Error("Response does not match ApiResponse schema");
    // }

    // Log response
    if (this.enableLogging && process.env.NODE_ENV !== "test") {
      const logLevel = this.statusCode >= 400 ? "error" : "info";
      logger[logLevel]("Response sent", {
        statusCode: this.statusCode,
        message: payload.message,
        responseTimeMs: payload.responseTimeMs,
        requestId: this.requestId,
        method: this.res.req?.method,
        url: this.res.req?.originalUrl,
      });
    }

    // Apply headers only if they haven't been sent
    if (!this.res.headersSent) {
      for (const [key, value] of Object.entries(this.headers)) {
        this.res.setHeader(key, value);
      }
    }

    // Send response
    this.res.status(this.statusCode).json(payload);
  }

  // --- Common Static Shortcuts ---

  /**
   * Sends a 200 OK response.
   * @param res - Express Response object
   * @param data - Response data
   * @param options - Optional message, metadata, and headers
   */
  static ok(
    res: Response,
    data?: any,
    options: {
      message?: string;
      meta?: MetaData;
      headers?: Record<string, string>;
    } = {}
  ) {
    const builder = new ResponseBuilder(res)
      .status(200)
      .withData(data)
      .message(options.message || STATUS_MESSAGES[200]);
    if (options.meta) builder.withMeta(options.meta);
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        builder.withHeader(key, value);
      }
    }
    builder.send();
  }

  /**
   * Sends a 201 Created response.
   * @param res - Express Response object
   * @param data - Response data
   * @param options - Optional message, metadata, and headers
   */
  static created(
    res: Response,
    data?: any,
    options: {
      message?: string;
      meta?: MetaData;
      headers?: Record<string, string>;
    } = {}
  ) {
    const builder = new ResponseBuilder(res)
      .status(201)
      .withData(data)
      .message(options.message || STATUS_MESSAGES[201]);
    if (options.meta) builder.withMeta(options.meta);
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        builder.withHeader(key, value);
      }
    }
    builder.send();
  }

  /**
   * Sends a 204 No Content response.
   * @param res - Express Response object
   * @param options - Optional message, metadata, and headers
   */
  static noContent(
    res: Response,
    options: {
      message?: string;
      meta?: MetaData;
      headers?: Record<string, string>;
    } = {}
  ) {
    const builder = new ResponseBuilder(res)
      .status(204)
      .message(options.message || STATUS_MESSAGES[204]);
    if (options.meta) builder.withMeta(options.meta);
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        builder.withHeader(key, value);
      }
    }
    builder.send();
  }

  /**
   * Sends a 400 Bad Request response.
   * @param res - Express Response object
   * @param options - Optional message, metadata, and headers
   */
  static badRequest(
    res: Response,
    options: {
      message?: string;
      meta?: MetaData;
      headers?: Record<string, string>;
    } = {}
  ) {
    const builder = new ResponseBuilder(res)
      .status(400)
      .message(options.message || STATUS_MESSAGES[400]);
    if (options.meta) builder.withMeta(options.meta);
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        builder.withHeader(key, value);
      }
    }
    builder.send();
  }

  /**
   * Sends a 401 Unauthorized response.
   * @param res - Express Response object
   * @param options - Optional message, metadata, and headers
   */
  static unauthorized(
    res: Response,
    options: {
      message?: string;
      meta?: MetaData;
      headers?: Record<string, string>;
    } = {}
  ) {
    const builder = new ResponseBuilder(res)
      .status(401)
      .message(options.message || STATUS_MESSAGES[401]);
    if (options.meta) builder.withMeta(options.meta);
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        builder.withHeader(key, value);
      }
    }
    builder.send();
  }

  /**
   * Sends a 403 Forbidden response.
   * @param res - Express Response object
   * @param options - Optional message, metadata, and headers
   */
  static forbidden(
    res: Response,
    options: {
      message?: string;
      meta?: MetaData;
      headers?: Record<string, string>;
    } = {}
  ) {
    const builder = new ResponseBuilder(res)
      .status(403)
      .message(options.message || STATUS_MESSAGES[403]);
    if (options.meta) builder.withMeta(options.meta);
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        builder.withHeader(key, value);
      }
    }
    builder.send();
  }

  /**
   * Sends a 404 Not Found response.
   * @param res - Express Response object
   * @param options - Optional message, metadata, and headers
   */
  static notFound(
    res: Response,
    options: {
      message?: string;
      meta?: MetaData;
      headers?: Record<string, string>;
    } = {}
  ) {
    const builder = new ResponseBuilder(res)
      .status(404)
      .message(options.message || STATUS_MESSAGES[404]);
    if (options.meta) builder.withMeta(options.meta);
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        builder.withHeader(key, value);
      }
    }
    builder.send();
  }

  /**
   * Sends a 409 Conflict response.
   * @param res - Express Response object
   * @param options - Optional message, metadata, and headers
   */
  static conflict(
    res: Response,
    options: {
      message?: string;
      meta?: MetaData;
      headers?: Record<string, string>;
    } = {}
  ) {
    const builder = new ResponseBuilder(res)
      .status(409)
      .message(options.message || STATUS_MESSAGES[409]);
    if (options.meta) builder.withMeta(options.meta);
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        builder.withHeader(key, value);
      }
    }
    builder.send();
  }

  /**
   * Sends a 422 Unprocessable Entity response with validation errors.
   * @param res - Express Response object
   * @param errors - Array of validation error details
   * @param options - Optional message, metadata, and headers
   */
  static validationError(
    res: Response,
    errors: Array<{ field: string; issue: string; path?: string }>,
    options: {
      message?: string;
      meta?: MetaData;
      headers?: Record<string, string>;
    } = {}
  ) {
    const builder = new ResponseBuilder(res)
      .status(422)
      .message(options.message || STATUS_MESSAGES[422])
      .withValidationErrors(errors);
    if (options.meta) builder.withMeta(options.meta);
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        builder.withHeader(key, value);
      }
    }
    builder.send();
  }

  /**
   * Sends a 500 Internal Server Error response.
   * @param res - Express Response object
   * @param error - Error object
   * @param options - Optional message, metadata, and headers
   */
  static serverError(
    res: Response,
    error: Error,
    options: {
      message?: string;
      meta?: MetaData;
      headers?: Record<string, string>;
    } = {}
  ) {
    const builder = new ResponseBuilder(res)
      .status(500)
      .message(options.message || STATUS_MESSAGES[500])
      .withError(error);
    if (options.meta) builder.withMeta(options.meta);
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        builder.withHeader(key, value);
      }
    }
    builder.send();
  }
}
