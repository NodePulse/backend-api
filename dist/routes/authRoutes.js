import { login, logout, register } from "../controller/authController";
import { Router } from "express";
const authRouter = Router();
authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
export default authRouter;
//# sourceMappingURL=authRoutes.js.map