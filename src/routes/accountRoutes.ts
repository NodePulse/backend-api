// import { verifyFirebaseToken } from "@/middleware/accountMiddleware";
import { Router } from "express";

const accountRouter = Router();

accountRouter.get("/profile", (req, res) => {
  res.json({ message: "Welcome!", user: (req as any).user });
});

export default accountRouter;
