import { env } from "../../shared/config/env";
import prisma from "../config/prisma";
import { ERROR_CODES } from "../../shared/constants/errorCodes";
import type { AuthenticatedRequest } from "../../shared/types/express";
import { logger } from "../../shared/utils/appSetup";
import { ResponseBuilder } from "../../shared/utils/responseHandler";
import type { Response } from "express";

export const getUserDashboard = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const requestId = crypto.randomUUID();
  const user = req.user;

  if (!user) {
    logger.warn("Get user dashboard attempted without authentication", {
      requestId,
    });
    return new ResponseBuilder(res)
      .status(401)
      .message("User not authenticated")
      .withErrorCode(ERROR_CODES.NOT_AUTHENTICATED)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }

  try {
    const userDashbaord = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        gender: true,
        image: true,
        role: true,
        phone: true,
        bio: true,
        dateOfBirth: true,
        city: true,
        country: true,
        company: true,
        jobTitle: true,
        website: true,
        linkedinUrl: true,
        twitterUrl: true,
        instagramUrl: true,
        isActive: true,
        lastLoginAt: true,
        notificationsEnabled: true,
        createdAt: true,
        updatedAt: true,
        eventsAttending: true,
        organizedEvents: true,
      },
    });

    if (!userDashbaord) {
      logger.warn("User not found", { requestId, userId: user.id });
      return new ResponseBuilder(res)
        .status(404)
        .message("User not found")
        .withErrorCode(ERROR_CODES.USER_NOT_FOUND)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    const organizedEvents = await prisma.event.findMany({
      where: { organizerId: user.id },
      select: {
        id: true,
        title: true,
        description: true,
        attendees: {
          include: {
            user: {
              select: {
                _count: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!organizedEvents) {
      logger.warn("Organized events not found", { requestId, userId: user.id });
      return new ResponseBuilder(res)
        .status(404)
        .message("Organized events not found")
        .withErrorCode(ERROR_CODES.EVENT_NOT_FOUND)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }
    const dashboardCards = [
      {
        title: "Events Attended",
        value: "24",
        change: "+12%",
        trending: "up",
      },
      {
        title: "Events Created",
        value: "8",
        change: "+4",
        trending: "up",
      },
      {
        title: "Total Attendees",
        value: "482",
        change: "+18%",
        trending: "up",
      },
      {
        title: "Avg. Rating",
        value: "4.8",
        change: "+0.3",
        trending: "up",
      },
    ];

    const today = new Date();
    const last30Days = new Date(today.setDate(today.getDate() - 30));
    const previous30Days = new Date(today.setDate(today.getDate() - 60));
    // const totalEventsAttendedLast30Days = userDashbaord.eventsAttending.filter((event) => event.createdAt > last30Days && event.createdAt < previous30Days).length;

    const userDashboardResponse = [
        {
            title: "Events Attended",
            value: userDashbaord.eventsAttending.length,
            change: "+12%",
            trending: "up",
        }
    ]

    if (!userProfile) {
      logger.warn("User not found", { requestId, userId: user.id });
      return new ResponseBuilder(res)
        .status(404)
        .message("User not found")
        .withErrorCode(ERROR_CODES.USER_NOT_FOUND)
        .withRequestId(requestId)
        .withLogging(env.NODE_ENV !== "production")
        .send();
    }

    logger.info("User profile fetched successfully", {
      requestId,
      userId: user.id,
    });
    return new ResponseBuilder(res)
      .status(200)
      .message("User profile retrieved successfully")
      .withData(userProfile)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  } catch (error) {
    logger.error("Error fetching user profile", { requestId, error });
    return new ResponseBuilder(res)
      .status(500)
      .message("Failed to fetch user profile. Please try again later")
      .withError(error as Error)
      .withErrorCode(ERROR_CODES.INTERNAL_SERVER_ERROR)
      .withRequestId(requestId)
      .withLogging(env.NODE_ENV !== "production")
      .send();
  }
};
