// middleware/responseTimer.ts
import { Response, NextFunction } from "express";

export const responseTimer = (res: Response, next: NextFunction) => {
  (res as any)._startTime = Date.now();
  next();
};
