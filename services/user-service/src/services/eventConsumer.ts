import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";
import { createLogger, format, transports } from "winston";
import { env } from "../config/env.js";
import prisma from "../config/prisma.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

interface UserCreatedEvent {
  event: string;
  timestamp: string;
  data: {
    id: string;
    email: string;
    username: string;
    name?: string | null;
    image?: string | null;
    role: string;
    gender?: string | null;
  };
}

class EventConsumer {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly queueName: string;

  constructor() {
    this.queueName = env.RABBITMQ_USER_CREATED_QUEUE;
  }

  /**
   * Connect to RabbitMQ and start consuming events
   */
  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(env.RABBITMQ_URL);
      this.channel = await this.connection?.createChannel();

      // Declare queue for user created events
      await this.channel?.assertQueue(this.queueName, { durable: true });

      // Set prefetch to process one message at a time
      await this.channel?.prefetch(1);

      logger.info(`Waiting for user created events in ${this.queueName}`);

      // Start consuming events
      if (!this.channel) {
        throw new Error("Channel not initialized");
      }
      
      await this.channel.consume(
        this.queueName,
        async (msg: ConsumeMessage | null) => {
          if (msg && this.channel) {
            try {
              const event: UserCreatedEvent = JSON.parse(msg.content.toString());
              await this.handleUserCreatedEvent(event);
              this.channel.ack(msg);
            } catch (error) {
              logger.error("Error processing user created event", { error });
              if (this.channel) {
                this.channel.nack(msg, false, false);
              }
            }
          }
        },
        { noAck: false }
      );

      logger.info("Event consumer started successfully");
    } catch (error) {
      logger.error("Failed to connect event consumer", { error });
      throw error;
    }
  }

  /**
   * Handle user created event - create user profile in user_db
   */
  private async handleUserCreatedEvent(event: UserCreatedEvent): Promise<void> {
    const { data } = event;

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { id: data.id },
      });

      if (existingUser) {
        logger.info("User already exists in user_db", { userId: data.id });
        return;
      }

      // Create user profile in user_db
      await prisma.user.create({
        data: {
          id: data.id,
          email: data.email,
          username: data.username,
          name: data.name || null,
          image: data.image || null,
          role: data.role as any,
          gender: data.gender as any,
        },
      });

      logger.info("User profile created in user_db", { userId: data.id, email: data.email });
    } catch (error: any) {
      logger.error("Failed to create user profile in user_db", {
        error: error.message,
        userId: data.id,
        email: data.email,
      });
      throw error;
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
      logger.info("Event consumer connection closed");
    } catch (error) {
      logger.error("Error closing event consumer connection", { error });
    }
  }
}

export const eventConsumer = new EventConsumer();

