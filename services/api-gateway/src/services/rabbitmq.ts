// ============================================
// API Gateway - Persistent Connection
// ============================================

import amqp, { Connection, Channel, ConsumeMessage, ChannelModel } from "amqplib";
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
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private responseHandlers: Map<string, (response: QueueResponse) => void> = new Map();
  private readonly responseQueue: string = env.RABBITMQ_RESPONSE_QUEUE;
  private isConnecting = false;
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private readonly baseReconnectDelay = 1000;
  private readonly maxReconnectDelay = 30000;
  private consumerTag: string | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;

  constructor() {}

  private getReconnectDelay() {
    const exp = Math.min(this.reconnectAttempts, 10);
    const delay = Math.min(this.baseReconnectDelay * Math.pow(2, exp), this.maxReconnectDelay);
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
    }, 60000); // Check every 60 seconds
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.connection && this.channel)) return;
    this.isConnecting = true;

    while (this.shouldReconnect) {
      try {
        logger.info("Attempting to connect to RabbitMQ", {
          url: env.RABBITMQ_URL,
          attempt: this.reconnectAttempts + 1
        });

        this.connection = await amqp.connect(env.RABBITMQ_URL, {
          heartbeat: 30,
          connectionTimeout: 30000
        });

        this.channel = await this.connection.createChannel();

        // Connection handlers - auto-reconnect on close
        this.connection?.on("error", (err: any) => {
          logger.error("RabbitMQ connection error", { 
            message: err?.message ?? String(err) 
          });
          // Don't close, just log
        });

        this.connection?.on("close", () => {
          logger.warn("RabbitMQ connection closed unexpectedly, will attempt reconnect");
          // Schedule reconnect but don't cleanup immediately
          this.scheduleReconnect();
        });

        this.channel?.on("error", (err: any) => {
          logger.error("RabbitMQ channel error", { 
            message: err?.message ?? String(err) 
          });
        });

        this.channel?.on("close", () => {
          logger.warn("RabbitMQ channel closed unexpectedly");
        });

        // Ensure response queue exists
        await this.channel?.assertQueue(this.responseQueue, { durable: true });
        await this.startResponseConsumer();

        // Start keep-alive interval
        this.startKeepAlive();

        // Reset attempts on success
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        logger.info("✅ RabbitMQ connected and will stay persistent", {
          responseQueue: this.responseQueue
        });
        return;
      } catch (err: any) {
        this.reconnectAttempts += 1;
        const delay = this.getReconnectDelay();
        logger.error("RabbitMQ connection failed", {
          attempt: this.reconnectAttempts,
          message: err?.message ?? String(err),
          nextRetryMs: delay
        });
        await new Promise((r) => setTimeout(r, delay));
      } finally {
        this.isConnecting = false;
      }
    }
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect) return;
    const delay = this.getReconnectDelay();
    logger.info("Scheduling RabbitMQ reconnect", { delayMs: delay });
    
    setTimeout(() => {
      this.connect().catch((err) =>
        logger.error("Reconnect attempt failed", {
          message: err?.message ?? String(err)
        })
      );
    }, delay);
  }

  private async startResponseConsumer(): Promise<void> {
    if (!this.channel) throw new Error("Channel not initialized");

    await this.channel.assertQueue(this.responseQueue, { durable: true });

    const onMessage = async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const response: QueueResponse = JSON.parse(msg.content.toString());
        const handler = this.responseHandlers.get(response.requestId);
        if (handler) {
          try {
            handler(response);
          } catch (e) {
            logger.error("Response handler threw", {
              requestId: response.requestId,
              err: (e as Error).message
            });
          }
          this.responseHandlers.delete(response.requestId);
        } else {
          logger.warn("No response handler found for requestId", {
            requestId: response.requestId
          });
        }
        await this.channel!.ack(msg);
      } catch (err: any) {
        logger.error("Failed to process response message", {
          error: err?.message ?? String(err)
        });
        try {
          await this.channel!.nack(msg, false, false);
        } catch (e) {
          logger.error("Failed to nack message", {
            error: (e as Error).message
          });
        }
      }
    };

    const consumeResult = await this.channel.consume(this.responseQueue, onMessage, {
      noAck: false
    });
    this.consumerTag = consumeResult.consumerTag;
    logger.info("Attached consumer to response queue", {
      queue: this.responseQueue,
      consumerTag: this.consumerTag
    });
  }

  private async ensureConnected(): Promise<void> {
    if (this.channel && this.connection) return;
    await this.connect();
    if (!this.channel) throw new Error("Unable to establish RabbitMQ channel");
  }

  async sendMessage(
    service: "auth" | "user" | "event",
    action: string,
    data: any,
    headers?: Record<string, any>
  ): Promise<QueueResponse> {
    await this.ensureConnected();
    if (!this.channel) throw new Error("RabbitMQ channel not initialized");

    const requestId = crypto.randomUUID();
    let queueName: string;
    if (service === "auth") queueName = env.RABBITMQ_AUTH_QUEUE;
    else if (service === "user") queueName = env.RABBITMQ_USER_QUEUE;
    else if (service === "event") queueName = env.RABBITMQ_EVENT_QUEUE;
    else throw new Error(`Unknown service: ${service}`);

    await this.channel.assertQueue(queueName, { durable: true });

    const message: QueueMessage = { requestId, action, service, data, headers };

    const ok = this.channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      correlationId: requestId,
      replyTo: this.responseQueue
    });

    if (!ok) {
      logger.warn("sendToQueue returned false (backpressure)", { queueName, requestId });
      await new Promise((r) => setTimeout(r, 50));
    }

    logger.info("Message sent to service queue", {
      service,
      action,
      requestId,
      queueName
    });

    return await new Promise<QueueResponse>((resolve, reject) => {
      const timeoutMs = 30000;
      const timeout = setTimeout(() => {
        this.responseHandlers.delete(requestId);
        reject(new Error(`Request timeout for ${requestId}`));
      }, timeoutMs);

      this.responseHandlers.set(requestId, (resp: QueueResponse) => {
        clearTimeout(timeout);
        resolve(resp);
      });
    });
  }

  /**
   * ⚠️ IMPORTANT: This will NOT close the RabbitMQ connection
   * Only stops the keep-alive interval and cleans up handlers
   */
  async close(): Promise<void> {
    logger.info("Close called - keeping RabbitMQ connection persistent");
    
    // Stop keep-alive interval
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    // Clear pending handlers gracefully
    this.responseHandlers.forEach((handler, requestId) => {
      try {
        handler({
          requestId,
          success: false,
          statusCode: 503,
          error: { message: "Service shutting down" }
        });
      } catch (e) {
        logger.warn("Error rejecting handler on shutdown", { requestId });
      }
    });
    this.responseHandlers.clear();

    // ⚠️ DO NOT close channel or connection
    // this.channel = null;
    // this.connection = null;

    logger.info("Shutdown complete - RabbitMQ connection remains open for reuse");
  }

  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }
}

export const rabbitMQService = new RabbitMQService();