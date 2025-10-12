import { getTransactionHistory } from "../controller/transactionController.js";
import { protect } from "../middleware/authMiddleware.js";
import { Router } from "express";

const transactionRouter = Router();

transactionRouter.get("/all", protect, getTransactionHistory)

export default transactionRouter;
