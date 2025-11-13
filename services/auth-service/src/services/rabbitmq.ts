import * as amqp from "amqplib";
import { createLogger, format, transports } from "winston";
import { env } from "../config/env.js";
import * as authController from "../controller/authController.js";

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
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private readonly queueName: string;
  private readonly responseQueue: string;

  constructor() {
    this.queueName = env.RABBITMQ_AUTH_QUEUE;
    this.responseQueue = env.RABBITMQ_RESPONSE_QUEUE;
  }

  /**
   * Connect to RabbitMQ and start consuming messages
   */
  async connect(): Promise<void> {
    try {
      logger.info("Connecting to RabbitMQ...");
      this.connection = await amqp.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Declare queues
      await this.channel.assertQueue(this.queueName, { durable: true });
      await this.channel.assertQueue(this.responseQueue, { durable: true });

      // Limit to one unacknowledged message at a time
      this.channel.prefetch(1);

      logger.info(`✅ Waiting for messages in queue: ${this.queueName}`);

      this.channel.consume(
        this.queueName,
        async (msg: amqp.ConsumeMessage | null) => {
          if (!msg) return;
          try {
            const message: QueueMessage = JSON.parse(msg.content.toString());
            await this.handleMessage(message);
            this.channel?.ack(msg);
          } catch (error) {
            logger.error("Error processing message", { error });
            this.channel?.nack(msg, false, false);
          }
        },
        { noAck: false }
      );

      logger.info("RabbitMQ consumer started successfully");
    } catch (error) {
      logger.error("❌ Failed to connect to RabbitMQ", { error });
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
      // Route message to controller actions
      switch (action) {
        case "register":
          response = await authController.register(requestId, data);
          break;
        case "login":
          response = await authController.login(requestId, data);
          break;
        case "logout":
          response = await authController.logout(requestId, headers);
          break;
        case "getMe":
          response = await authController.getMe(requestId, headers);
          break;
        case "changePassword":
          response = await authController.changePassword(requestId, data, headers);
          break;
        case "forgotPassword":
          response = await authController.forgotPassword(requestId, data);
          break;
        case "verifyOTP":
          response = await authController.verifyOTP(requestId, data);
          break;
        case "changeForgotPassword":
          response = await authController.changeForgotPassword(requestId, data);
          break;
        default:
          response = {
            requestId,
            success: false,
            statusCode: 404,
            error: { message: `Unknown action: ${action}` },
          };
      }

      // Send response back to API Gateway
      if (!this.channel) {
        logger.error("RabbitMQ channel not initialized");
        return;
      }

      this.channel.sendToQueue(
        this.responseQueue,
        Buffer.from(JSON.stringify(response)),
        { persistent: true, correlationId: requestId }
      );

      logger.info("Response sent", {
        requestId,
        statusCode: response.statusCode,
      });
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
          { persistent: true, correlationId: requestId }
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