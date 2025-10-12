import prisma from "@/config/prisma";
import { Request, Response } from "express";

export const getTransactionHistory = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ error: "User not authenticated." });
  }

  const allTransactions = await prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json(allTransactions);
};
