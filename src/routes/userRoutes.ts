import { getOrganizedEvents, getUserEvents, getUserProfile } from "@/controller/userController.js";
import { protect } from "@/middleware/authMiddleware";
import { Router } from "express";

const userRouter = Router()

userRouter.get("/profile", protect, getUserProfile )
userRouter.get("/events", protect, getUserEvents )
userRouter.get("/organized-events", protect, getOrganizedEvents)

export default userRouter;