export interface ServiceResponse {
  requestId: string;
  success: boolean;
  statusCode: number;
  data?: any;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

export class ResponseBuilder {
  private requestId: string;
  private success = true;
  private statusCode = 200;
  private data: any = null;
  private error: ServiceResponse["error"] = undefined;

  constructor(requestId: string) {
    this.requestId = requestId;
  }

  status(code: number): this {
    this.statusCode = code;
    this.success = code >= 200 && code < 300;
    return this;
  }

  withData(data: any): this {
    this.data = data;
    return this;
  }

  withError(message: string, code?: string, details?: any): this {
    this.error = { message, code, details };
    return this;
  }

  build(): ServiceResponse {
    return {
      requestId: this.requestId,
      success: this.success,
      statusCode: this.statusCode,
      data: this.data,
      error: this.error,
    };
  }
}

