import { getOrganizedEvents, getUserEvents, getUserProfile, updateProfileImage } from "../controller/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { Router } from "express";
import multer from "multer"

const userRouter = Router()
const upload = multer({ storage: multer.memoryStorage() });

userRouter.put(
  "/profile-image",
  protect,
  upload.fields([
    { name: "image", maxCount: 1 },
  ]),
  updateProfileImage
);

userRouter.get("/profile", protect, getUserProfile )
userRouter.get("/events", protect, getUserEvents )
userRouter.get("/organized-events", protect, getOrganizedEvents)

export default userRouter;