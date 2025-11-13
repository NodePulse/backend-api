import amqp from "amqplib";
import type { ChannelModel, Channel } from "amqplib";
import { createLogger, format, transports } from "winston";
import { env } from "../config/env.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

interface PublishOptions {
  persistent?: boolean;
  contentType?: string;
}

class EventPublisher {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly queueName: string;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 5000; // 5 seconds
  private isConnecting = false;

  constructor() {
    this.queueName = env.RABBITMQ_USER_CREATED_QUEUE;
  }

  /**
   * Connect to RabbitMQ with automatic reconnection
   */
  async connect(): Promise<void> {
    if (this.isConnecting) {
      logger.info("Connection already in progress");
      return;
    }

    this.isConnecting = true;

    try {
      this.connection = await amqp.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Setup connection event handlers
      this.connection.on("error", (err) => {
        logger.error("RabbitMQ connection error", { error: err.message });
        this.handleConnectionError();
      });

      this.connection.on("close", () => {
        logger.warn("RabbitMQ connection closed");
        this.connection = null;
        this.channel = null;
      });

      // Declare queue for user created events
      await this.channel.assertQueue(this.queueName, { durable: true });

      logger.info("Event publisher connected successfully");
      this.reconnectAttempts = 0;
    } catch (error) {
      logger.error("Failed to connect event publisher", {
        error: error instanceof Error ? error.message : String(error),
        attempt: this.reconnectAttempts + 1,
      });

      this.handleConnectionError();
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Handle connection errors with exponential backoff retry
   */
  private async handleConnectionError(): Promise<void> {
    this.connection = null;
    this.channel = null;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      logger.info(`Attempting to reconnect in ${delay}ms`, {
        attempt: this.reconnectAttempts,
      });

      setTimeout(() => {
        this.connect().catch((err) => {
          logger.error("Reconnection failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }, delay);
    } else {
      logger.error("Max reconnection attempts reached");
    }
  }

  /**
   * Ensure channel is available
   */
  private async ensureChannel(): Promise<Channel> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error("Failed to establish RabbitMQ channel");
    }

    return this.channel;
  }

  /**
   * Publish user created event
   */
  async publishUserCreated(
    userData: {
      id: string;
      email: string;
      username: string;
      name?: string | null;
      image?: string | null;
      role: string;
      gender?: string | null;
    },
    options: PublishOptions = {}
  ): Promise<void> {
    const {
      persistent = true,
      contentType = "application/json",
    } = options;

    try {
      const channel = await this.ensureChannel();

      const message = {
        event: "user.created",
        timestamp: new Date().toISOString(),
        data: userData,
      };

      const buffer = Buffer.from(JSON.stringify(message));

      const success = channel.sendToQueue(this.queueName, buffer, {
        persistent,
        contentType,
        contentEncoding: "utf-8",
      });

      if (!success) {
        logger.warn("Message queue buffer full", { userId: userData.id });
        // Consider implementing backpressure handling here
      } else {
        logger.info("User created event published", { userId: userData.id });
      }
    } catch (error) {
      logger.error("Failed to publish user created event", {
        error: error instanceof Error ? error.message : String(error),
        userId: userData.id,
      });
      throw error;
    }
  }

  /**
   * Publish generic event
   */
  async publish(
    eventName: string,
    data: Record<string, unknown>,
    options: PublishOptions = {}
  ): Promise<void> {
    const {
      persistent = true,
      contentType = "application/json",
    } = options;

    try {
      const channel = await this.ensureChannel();

      const message = {
        event: eventName,
        timestamp: new Date().toISOString(),
        data,
      };

      const buffer = Buffer.from(JSON.stringify(message));

      channel.sendToQueue(this.queueName, buffer, {
        persistent,
        contentType,
        contentEncoding: "utf-8",
      });

      logger.info("Event published", { event: eventName });
    } catch (error) {
      logger.error("Failed to publish event", {
        error: error instanceof Error ? error.message : String(error),
        event: eventName,
      });
      throw error;
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }

  /**
   * Close connection gracefully
   */
  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      logger.info("Event publisher connection closed");
    } catch (error) {
      logger.error("Error closing event publisher connection", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const eventPublisher = new EventPublisher();