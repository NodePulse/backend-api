import amqp, { Connection, Channel } from "amqplib";
import { createLogger, format, transports } from "winston";
import { env } from "../config/env.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

class EventPublisher {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly queueName: string;

  constructor() {
    this.queueName = env.RABBITMQ_USER_CREATED_QUEUE;
  }

  /**
   * Connect to RabbitMQ
   */
  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Declare queue for user created events
      await this.channel.assertQueue(this.queueName, { durable: true });

      logger.info("Event publisher connected successfully");
    } catch (error) {
      logger.error("Failed to connect event publisher", { error });
      throw error;
    }
  }

  /**
   * Publish user created event
   */
  async publishUserCreated(userData: {
    id: string;
    email: string;
    username: string;
    name?: string | null;
    image?: string | null;
    role: string;
    gender?: string | null;
  }): Promise<void> {
    if (!this.channel) {
      logger.warn("Event publisher channel not initialized");
      return;
    }

    try {
      const message = {
        event: "user.created",
        timestamp: new Date().toISOString(),
        data: userData,
      };

      this.channel.sendToQueue(
        this.queueName,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
        }
      );

      logger.info("User created event published", { userId: userData.id });
    } catch (error) {
      logger.error("Failed to publish user created event", { error, userId: userData.id });
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info("Event publisher connection closed");
    } catch (error) {
      logger.error("Error closing event publisher connection", { error });
    }
  }
}

export const eventPublisher = new EventPublisher();

