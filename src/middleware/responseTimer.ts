// middleware/responseTimer.ts
import { Request, Response, NextFunction } from "express";

export const responseTimer = (req: Request, res: Response, next: NextFunction) => {
  (res as any)._startTime = Date.now();
  next();
};
