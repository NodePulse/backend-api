import type { Response } from "express";
import type { AuthenticatedRequest } from "../../shared/types/express";
import { createLogger, format, transports } from "winston";
import prisma from "../config/prisma";
import { ResponseBuilder } from "../../shared/utils/responseHandler";
import { env } from "../../shared/config/env";
import { ERROR_CODES } from "../../shared/constants/errorCodes";

// Structured logger
const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

export const getTransactionHistory = async (req: AuthenticatedRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  const user = req.user;

  if (!user) {
    logger.warn("Get transaction history attempted without authentication", { requestId });
    return new ResponseBuilder(res)
      .status(401)
      .message("User not authenticated")
      .withErrorCode(ERROR_CODES.NOT_AUTHENTICATED)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  try {
    const allTransactions = await prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    logger.info("Transaction history fetched successfully", { requestId, userId: user.id });
    return new ResponseBuilder(res)
      .status(200)
      .message("Transaction history retrieved successfully")
      .withData(allTransactions)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Error fetching transaction history", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to fetch transaction history. Please try again later")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.INTERNAL_SERVER_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};
