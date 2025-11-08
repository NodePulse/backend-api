import { UserRole } from "@prisma/client";
import type { Request } from "express";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

