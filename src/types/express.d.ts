import { UserRole } from "@prisma/client";
import type { Request } from "express";

// This new type represents the user object we'll attach to requests.
// It includes only the safe and necessary fields for your application logic.
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

// Extend the existing Express Request interface
// declare global {
//   namespace Express {
//     export interface Request {
//       // Use our new, more accurate type for the user property
//       user?: AuthenticatedUser;
//     }
//   }
// }
