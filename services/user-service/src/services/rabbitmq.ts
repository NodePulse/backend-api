import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";
import { createLogger, format, transports } from "winston";
import { env } from "../config/env.js";
import * as userController from "../controller/userController.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

export interface QueueMessage {
  requestId: string;
  action: string;
  service: "auth" | "user";
  data: any;
  headers?: Record<string, any>;
}

class RabbitMQConsumer {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly queueName: string;
  private readonly responseQueue: string;

  constructor() {
    this.queueName = env.RABBITMQ_USER_QUEUE;
    this.responseQueue = env.RABBITMQ_RESPONSE_QUEUE;
  }

  /**
   * Connect to RabbitMQ and start consuming messages
   */
  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Declare queues
      await this.channel.assertQueue(this.queueName, { durable: true });
      await this.channel.assertQueue(this.responseQueue, { durable: true });

      // Set prefetch to process one message at a time
      await this.channel.prefetch(1);

      logger.info(`Waiting for messages in ${this.queueName}`);

      // Start consuming messages
      await this.channel.consume(
        this.queueName,
        async (msg: ConsumeMessage | null) => {
          if (msg) {
            try {
              const message: QueueMessage = JSON.parse(msg.content.toString());
              await this.handleMessage(message);
              this.channel?.ack(msg);
            } catch (error) {
              logger.error("Error processing message", { error });
              this.channel?.nack(msg, false, false);
            }
          }
        },
        { noAck: false }
      );

      logger.info("RabbitMQ consumer started successfully");
    } catch (error) {
      logger.error("Failed to connect to RabbitMQ", { error });
      throw error;
    }
  }

  /**
   * Handle incoming message and send response
   */
  private async handleMessage(message: QueueMessage): Promise<void> {
    const { requestId, action, data, headers } = message;

    logger.info("Processing message", { requestId, action, service: message.service });

    let response;

    try {
      // Route to appropriate controller method
      switch (action) {
        case "getProfile":
          response = await userController.getProfile(requestId, headers);
          break;
        case "updateProfile":
          response = await userController.updateProfile(requestId, data, headers);
          break;
        case "updateProfileImage":
          response = await userController.updateProfileImage(requestId, data, headers);
          break;
        case "changePassword":
          response = await userController.changePassword(requestId, data, headers);
          break;
        case "getUserEvents":
          response = await userController.getUserEvents(requestId, headers);
          break;
        case "getOrganizedEvents":
          response = await userController.getOrganizedEvents(requestId, headers);
          break;
        default:
          response = {
            requestId,
            success: false,
            statusCode: 404,
            error: {
              message: `Unknown action: ${action}`,
            },
          };
      }

      // Send response back to API Gateway
      if (this.channel) {
        this.channel.sendToQueue(
          this.responseQueue,
          Buffer.from(JSON.stringify(response)),
          {
            persistent: true,
            correlationId: requestId,
          }
        );

        logger.info("Response sent", { requestId, statusCode: response.statusCode });
      }
    } catch (error: any) {
      logger.error("Error handling message", { requestId, error });
      const errorResponse = {
        requestId,
        success: false,
        statusCode: 500,
        error: {
          message: "Internal server error",
          details: error.message,
        },
      };

      if (this.channel) {
        this.channel.sendToQueue(
          this.responseQueue,
          Buffer.from(JSON.stringify(errorResponse)),
          {
            persistent: true,
            correlationId: requestId,
          }
        );
      }
    }
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
        await this.connection.close();
      }
      logger.info("RabbitMQ connection closed");
    } catch (error) {
      logger.error("Error closing RabbitMQ connection", { error });
    }
  }
}

export const rabbitMQConsumer = new RabbitMQConsumer();

