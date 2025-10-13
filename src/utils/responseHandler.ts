import { Response } from "express"; // Assuming you are using Express

// A dictionary of standard status code descriptions for consistency
const STATUS_MESSAGES: Readonly<{ [key: number]: string }> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  500: "Internal Server Error",
};

/**
 * A fluent API for building and sending standardized API responses.
 * @class ResponseBuilder
 * @example
 * new ResponseBuilder(res)
 * .status(200)
 * .message("User details fetched successfully.")
 * .data({ id: 1, name: "John Doe" })
 * .meta({ total: 1 })
 * .send();
 */
export class ResponseBuilder {
  private res: Response;
  private statusCode: number = 200;
  private customMessage?: string;
  private data: any = null;
  private meta: { [key: string]: any } = {};
  private error: { [key: string]: any } | null = null;
  private headers: { [key: string]: string } = {};
  private locale: string = "en-US";
  private requestContext: { [key: string]: any } | null = null;

  constructor(res: Response) {
    this.res = res;
  }

  /** Sets the HTTP status code for the response. */
  public status(code: number): this {
    this.statusCode = code;
    return this;
  }

  /** Sets a custom success or error message. */
  public message(message: string): this {
    this.customMessage = message;
    return this;
  }

  /** Attaches a data payload to the response. */
  public withData(data: any): this {
    this.data = data;
    return this;
  }

  /** Attaches metadata, such as pagination details. */
  public withMeta(meta: { [key: string]: any }): this {
    this.meta = { ...this.meta, ...meta };
    return this;
  }

  /** Attaches error details. For use with non-2xx status codes. */
  public withError(error: Error | { [key: string]: any }): this {
    this.error = {
      message: error.message,
      ...(process.env.NODE_ENV !== "production" && error.stack
        ? { stack: error.stack }
        : {}),
    };
    return this;
  }

  /** Sets a custom response header. */
  public withHeader(key: string, value: string): this {
    this.headers[key] = value;
    return this;
  }

  /** Sets the locale for the response context. */
  public withLocale(locale: string): this {
    this.locale = locale;
    return this;
  }

  /** Attaches request context for debugging purposes. */
  public withRequestContext(context: { [key: string]: any }): this {
    this.requestContext = context;
    return this;
  }

  /**
   * Constructs and sends the final JSON response.
   */
  public send(): void {
    const success = this.statusCode >= 200 && this.statusCode < 300;

    const payload: { [key: string]: any } = {
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
      apiVersion: "1.0.0",
      locale: this.locale,
    };

    if (this.data !== null) payload.data = this.data;
    if (Object.keys(this.meta).length > 0) payload.meta = this.meta;
    if (this.error !== null) payload.error = this.error;
    if (this.requestContext !== null)
      payload.requestContext = this.requestContext;

    // Set custom headers
    Object.entries(this.headers).forEach(([key, value]) => {
      this.res.setHeader(key, value);
    });

    this.res.status(this.statusCode).json(payload);
  }

  // --- STATIC SHORTCUTS FOR COMMON RESPONSES ---

  /** Sends a 200 OK response. */
  static ok = (res: Response, data?: any, message?: string) =>
    new ResponseBuilder(res)
      .status(200)
      .withData(data)
      .message(message || "Success.")
      .send();

  /** Sends a 201 Created response. */
  static created = (res: Response, data?: any, message?: string) =>
    new ResponseBuilder(res)
      .status(201)
      .withData(data)
      .message(message || "Resource created.")
      .send();

  /** Sends a 400 Bad Request response. */
  static badRequest = (res: Response, message?: string, error?: any) =>
    new ResponseBuilder(res)
      .status(400)
      .message(message || "Bad request.")
      .withError(error || {})
      .send();

  /** Sends a 401 Unauthorized response. */
  static unauthorized = (res: Response, message?: string) =>
    new ResponseBuilder(res)
      .status(401)
      .message(message || "Unauthorized.")
      .send();

  /** Sends a 404 Not Found response. */
  static notFound = (res: Response, message?: string) =>
    new ResponseBuilder(res)
      .status(404)
      .message(message || "Resource not found.")
      .send();

  /** Sends a 500 Internal Server Error response. */
  static serverError = (res: Response, error: Error, message?: string) =>
    new ResponseBuilder(res)
      .status(500)
      .message(message || "An internal server error occurred.")
      .withError(error)
      .send();
}
