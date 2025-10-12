import { getAuth } from "firebase-admin/auth";
import { Request, Response } from "express";
import prisma from "../config/prisma.js";

// Controller for Google Sign-In
export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body; // coming from frontend Firebase login

    if (!idToken) {
      return res.status(400).json({ error: "Missing idToken" });
    }

    // Verify token with Firebase Admin
    const decodedToken = await getAuth().verifyIdToken(idToken);

    const { uid, email, name, picture } = decodedToken;
    if (!uid || !email) {
      return res.status(400).json({ error: "Missing email" });
    }

    // Create or find user
    const user = await prisma.user.upsert({
      where: { id: uid },
      update: {
        email,
        name,
        image: picture,
      },
      create: {
        id: uid, // Firebase UID as primary ID
        email,
        name,
        image: picture,
        username: email.split("@")[0],
      },
    });

    // Store or update account (Google provider)
    const account = await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: uid,
        },
      },
      update: {
        userId: user.id,
        provider: "google",
        type: "oauth",
        id_token: idToken,
      },
      create: {
        userId: user.id,
        provider: "google",
        providerAccountId: uid,
        type: "oauth",
        id_token: idToken,
      },
    });

    return res.json({ user, account });
  } catch (err) {
    console.error("Google Auth error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
