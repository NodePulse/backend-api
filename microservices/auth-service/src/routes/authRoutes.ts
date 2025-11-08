// src/routes/authRoutes.ts
import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  getMe,
  login,
  logout,
  register,
  verifyOTP,
  changeForgotPassword,
} from "../controller/authController";
import { protect } from "../middleware/authMiddleware";

const authRouter = Router();

/**
 * Register a new user (public)
 */
authRouter.post("/register", register);

/**
 * Log in a user (public)
 */
authRouter.post("/login", login);

/**
 * Log out a user (protected)
 */
authRouter.post("/logout", protect, logout);

/**
 * Get authenticated user profile (protected)
 */
authRouter.get("/me", protect, getMe);

/**
 * Change password for authenticated user (protected)
 */
authRouter.post("/change-password", protect, changePassword);

/**
 * Request password reset (public)
 */
authRouter.post("/forgot-password", forgotPassword);

/**
 * Verify OTP for password reset (public)
 */
authRouter.post("/verify-otp", verifyOTP);

/**
 * Change password using reset token (public)
 */
authRouter.post("/change-forgot-password", changeForgotPassword);

export default authRouter;
