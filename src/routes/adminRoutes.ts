import { changeAdminPassword, loginAdmin } from "@/controller/adminController";
import { protectAdmin } from "@/middleware/adminMiddleware";
import { Router } from "express";

const adminRouter = Router();

adminRouter.post("/login", loginAdmin);
adminRouter.post("/change-password", protectAdmin, changeAdminPassword);

adminRouter.get("/dashboard", protectAdmin, (req, res) => {
  res.json({ message: "Welcome Admin!", admin: (req as any).admin });
});

export default adminRouter;
