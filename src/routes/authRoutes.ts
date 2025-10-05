import { protect } from "../middleware/authMiddleware.js";
import { changePassword, forgotPassword, getMe, login, logout, register, verifyOTP, changeForgotPassword } from "../controller/authController.js";
import { Router } from "express";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.get("/me", protect, getMe)
authRouter.post("/change-password", protect, changePassword)
authRouter.post("/forgot-password", forgotPassword)
authRouter.post("/verify-otp", verifyOTP)
authRouter.post("/change-forgot-password", changeForgotPassword)

export default authRouter;
