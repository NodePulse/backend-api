import { login, logout, register } from "../controller/authController.js";
import { Router } from "express";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);

export default authRouter;
