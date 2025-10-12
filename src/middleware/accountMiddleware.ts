// // middleware/firebaseAuth.ts
// import { Request, Response, NextFunction } from "express";
// import admin from "@/config/firebase";

// export const verifyFirebaseToken = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader?.startsWith("Bearer ")) {
//     return res.status(401).json({ message: "No token provided" });
//   }

//   const idToken = authHeader.split(" ")[1];

//   try {
//     const decodedToken = await admin.auth().verifyIdToken(idToken);
//     (req as any).user = decodedToken;
//     next();
//     return;
//   } catch (error) {
//     return res.status(401).json({ message: "Unauthorized" });
//   }
// };
