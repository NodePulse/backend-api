import { Router } from "express";
import authRouter from "./authRoutes.js";
import accountRouter from "./accountRoutes.js";
import adminRouter from "./adminRoutes.js";
import eventRouter from "./eventRoutes.js";
import userRouter from "./userRoutes.js";
import transactionRouter from "./transactionRoutes.js";

const router = Router()

router.use("/user/auth", authRouter);
router.use("/admin/auth", adminRouter);
router.use("/admin/account", accountRouter);
router.use("/user/events", eventRouter);
router.use("/user", userRouter);
router.use("/transactions", transactionRouter)

export default router