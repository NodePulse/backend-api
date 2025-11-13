import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";
import crypto from "crypto";
import { createLogger, format, transports } from "winston";
import { env } from "../config/env.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

export interface QueueMessage {
  requestId: string;
  action: string;
  service: "auth" | "user" | "event";
  data: any;
  headers?: Record<string, any>;
}

export interface QueueResponse {
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

class RabbitMQService {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private responseHandlers: Map<string, (response: QueueResponse) => void> = new Map();
  private readonly responseQueue: string;

  constructor() {
    this.responseQueue = env.RABBITMQ_RESPONSE_QUEUE;
  }

  /**
   * Connect to RabbitMQ
   */
  async connect(): Promise<void> {
    try {
      // @ts-expect-error - amqplib types issue, works correctly at runtime
      this.connection = await amqp.connect(env.RABBITMQ_URL);
      if (!this.connection) {
        throw new Error("Failed to establish RabbitMQ connection");
      }
      // @ts-expect-error - amqplib types issue, works correctly at runtime
      this.channel = await this.connection.createChannel();
      if (!this.channel) {
        throw new Error("Failed to create RabbitMQ channel");
      }

      // Declare response queue for receiving responses
      await this.channel.assertQueue(this.responseQueue, {
        durable: true,
      });

      // Set up consumer for responses
      await this.channel.consume(
        this.responseQueue,
        (msg: ConsumeMessage | null) => {
          if (msg) {
            try {
              const response: QueueResponse = JSON.parse(msg.content.toString());
              const handler = this.responseHandlers.get(response.requestId);
              if (handler) {
                handler(response);
                this.responseHandlers.delete(response.requestId);
              }
              if (this.channel) {
                this.channel.ack(msg);
              }
            } catch (error) {
              logger.error("Error processing response message", { error });
              if (this.channel) {
                this.channel.nack(msg, false, false);
              }
            }
          }
        },
        { noAck: false }
      );

      logger.info("RabbitMQ connected successfully");
    } catch (error) {
      logger.error("Failed to connect to RabbitMQ", { error });
      throw error;
    }
  }

  /**
   * Send message to a service queue and wait for response
   */
  async sendMessage(
    service: "auth" | "user" | "event",
    action: string,
    data: any,
    headers?: Record<string, any>
  ): Promise<QueueResponse> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    const requestId = crypto.randomUUID();
    let queueName: string;
    if (service === "auth") {
      queueName = env.RABBITMQ_AUTH_QUEUE;
    } else if (service === "user") {
      queueName = env.RABBITMQ_USER_QUEUE;
    } else if (service === "event") {
      queueName = env.RABBITMQ_EVENT_QUEUE;
    } else {
      throw new Error(`Unknown service: ${service}`);
    }

    // Ensure queue exists
    await this.channel.assertQueue(queueName, { durable: true });

    const message: QueueMessage = {
      requestId,
      action,
      service,
      data,
      headers,
    };

    // Send message to service queue
    this.channel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        correlationId: requestId,
        replyTo: this.responseQueue,
      }
    );

    logger.info("Message sent to service queue", {
      service,
      action,
      requestId,
      queueName,
    });

    // Wait for response with timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responseHandlers.delete(requestId);
        reject(new Error(`Request timeout for ${requestId}`));
      }, 30000); // 30 second timeout

      this.responseHandlers.set(requestId, (response: QueueResponse) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }

  /**
   * Close RabbitMQ connection
   */
  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        // @ts-expect-error - amqplib types issue, works correctly at runtime
        await this.connection.close();
      }
      logger.info("RabbitMQ connection closed");
    } catch (error) {
      logger.error("Error closing RabbitMQ connection", { error });
    }
  }
}

export const rabbitMQService = new RabbitMQService();

