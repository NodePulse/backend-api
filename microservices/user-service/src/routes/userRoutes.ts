// src/routes/userRoutes.ts
import { Router } from "express";
import multer from "multer";
import {
  changeUserPassword,
  getOrganizedEvents,
  getUserEvents,
  getUserProfile,
  updateProfileImage,
  updateUserProfile,
} from "../controller/userController";
import { protect } from "../../shared/middleware/authMiddleware";

const userRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Get user profile (protected)
 */
userRouter.get("/profile", protect, getUserProfile);

/**
 * Update user profile (protected)
 */
userRouter.put("/profile", protect, updateUserProfile);

/**
 * Update profile image (protected)
 */
userRouter.put(
  "/profile-image",
  protect,
  upload.fields([{ name: "image", maxCount: 1 }]),
  updateProfileImage
);

/**
 * Change password (protected)
 */
userRouter.post("/change-password", protect, changeUserPassword);

/**
 * Get user registered events (protected)
 */
userRouter.get("/events", protect, getUserEvents);

/**
 * Get organized events (protected)
 */
userRouter.get("/organized-events", protect, getOrganizedEvents);

export default userRouter;
