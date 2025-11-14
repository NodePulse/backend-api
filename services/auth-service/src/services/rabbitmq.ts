// ============================================
// Auth Service - RabbitMQ Consumer (Persistent)
// ============================================

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
  private readonly queueName = env.RABBITMQ_AUTH_QUEUE;
  private readonly responseQueue = env.RABBITMQ_RESPONSE_QUEUE;
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private consumerTag: string | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;

  constructor() {}

  private getDelayMs() {
    const base = 500;
    const exp = Math.min(this.reconnectAttempts, 8);
    const delay = base * Math.pow(2, exp);
    return Math.floor(delay * (0.8 + Math.random() * 0.4));
  }

  /**
   * Keep connection alive by checking heartbeat
   */
  private startKeepAlive(): void {
    if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
    
    this.keepAliveInterval = setInterval(() => {
      if (this.connection && this.channel) {
        logger.debug("Keep-alive check: RabbitMQ connection is healthy");
      }
    }, 60000);
  }

  async connect(): Promise<void> {
    if (this.connection && this.channel) return;
    
    while (this.shouldReconnect) {
      try {
        logger.info("Connecting to RabbitMQ...", {
          url: env.RABBITMQ_URL,
          attempt: this.reconnectAttempts + 1
        });

        this.connection = await amqp.connect(env.RABBITMQ_URL, {
          heartbeat: 30,
          connectionTimeout: 30000
        });
        this.channel = await this.connection.createChannel();

        this.connection.on("error", (err: any) => {
          logger.error("RabbitMQ connection error", {
            message: err?.message ?? String(err)
          });
        });

        this.connection.on("close", () => {
          logger.warn("RabbitMQ connection closed unexpectedly, will attempt reconnect");
          this.scheduleReconnect();
        });

        this.channel.on("error", (err: any) => {
          logger.error("RabbitMQ channel error", {
            message: err?.message ?? String(err)
          });
        });

        this.channel.on("close", () => {
          logger.warn("RabbitMQ channel closed");
        });

        await this.channel.assertQueue(this.queueName, { durable: true });
        await this.channel.assertQueue(this.responseQueue, { durable: true });

        this.channel.prefetch(1);

        await this.startConsumer();

        this.startKeepAlive();

        this.reconnectAttempts = 0;
        logger.info("✅ RabbitMQ consumer connected and will remain persistent", {
          queue: this.queueName
        });
        return;
      } catch (err: any) {
        this.reconnectAttempts += 1;
        const delay = this.getDelayMs();
        logger.error("Failed to connect to RabbitMQ", {
          attempt: this.reconnectAttempts,
          message: err?.message ?? String(err),
          nextRetryMs: delay
        });
        this.cleanup();
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect) return;
    this.reconnectAttempts = Math.max(this.reconnectAttempts, 1);
    const delay = this.getDelayMs();
    logger.info("Scheduling RabbitMQ reconnect", { delayMs: delay });
    
    setTimeout(
      () =>
        this.connect().catch((e) =>
          logger.error("Reconnect failed", { e: (e as Error).message })
        ),
      delay
    );
  }

  private cleanup() {
    this.channel = null;
    this.connection = null;
    this.consumerTag = null;
  }

  private async startConsumer(): Promise<void> {
    if (!this.channel) throw new Error("Channel not initialized");

    const onMessage = async (msg: amqp.ConsumeMessage | null) => {
      if (!msg) return;

      let message: QueueMessage | null = null;
      const corr = msg.properties.correlationId ?? null;

      try {
        message = JSON.parse(msg.content.toString());
      } catch (e) {
        logger.error("Invalid message JSON", { err: (e as Error).message });
        await this.channel!.ack(msg);
        return;
      }

      const { requestId, action, data, headers } = message!;
      logger.info("Processing message", {
        requestId,
        action,
        service: message?.service
      });

      try {
        let response;

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
              error: { message: `Unknown action: ${action}` }
            };
        }

        if (!this.channel) {
          logger.error("Channel missing before sendToQueue");
        } else if (!msg.properties.replyTo) {
          logger.error("No replyTo found on message; cannot reply", { requestId });
        } else {
          this.channel.sendToQueue(
            msg.properties.replyTo,
            Buffer.from(JSON.stringify(response)),
            {
              persistent: true,
              correlationId: msg.properties.correlationId
            }
          );
          logger.info("Response sent", {
            requestId,
            statusCode: response?.statusCode ?? null
          });
        }

        await this.channel!.ack(msg);
      } catch (e: any) {
        logger.error("Error handling message", {
          requestId,
          err: e?.message ?? String(e)
        });

        try {
          const errorResponse = {
            requestId,
            success: false,
            statusCode: 500,
            error: {
              message: "Internal server error",
              details: e?.message ?? String(e)
            }
          };

          if (this.channel && msg.properties.replyTo) {
            this.channel.sendToQueue(
              msg.properties.replyTo,
              Buffer.from(JSON.stringify(errorResponse)),
              {
                persistent: true,
                correlationId: msg.properties.correlationId
              }
            );
          }
        } catch (sendErr) {
          logger.error("Failed to send error response", {
            err: (sendErr as Error).message
          });
        }

        await this.channel!.ack(msg);
      }
    };

    const res = await this.channel.consume(this.queueName, onMessage, {
      noAck: false
    });
    this.consumerTag = res.consumerTag;
    logger.info("Consumer attached", {
      queue: this.queueName,
      consumerTag: this.consumerTag
    });
  }

  /**
   * ⚠️ IMPORTANT: This will NOT close the RabbitMQ connection
   * Only stops the keep-alive interval
   */
  async close(): Promise<void> {
    this.shouldReconnect = false;
    logger.info("Close called - keeping RabbitMQ connection persistent");

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    // ⚠️ DO NOT close channel or connection
    // this.channel = null;
    // this.connection = null;

    logger.info("Shutdown complete - RabbitMQ connection remains open for reuse");
  }

  get isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }
}

export const rabbitMQConsumer = new RabbitMQConsumer();
export default rabbitMQConsumer;