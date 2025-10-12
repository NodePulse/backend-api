import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import nodemailer from "nodemailer";

// const OTP_EXPIRY_MINUTES = 10;
// const OTP_RESEND_COOLDOWN_MINUTES = 2;
// const OTP_MAX_ATTEMPTS_PER_24H = 3;

const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
    expiresIn: "1d",
  });
};

const getImageUrl = (gender: string | undefined, username: string) => {
  if(gender === "Male") {
    return `https://avatar.iran.liara.run/public/boy?username=${username}`
  }
  else if(gender === "Female") {
    return `https://avatar.iran.liara.run/public/girl?username=${username}`
  }
  else {
    return `https://avatar.iran.liara.run/username?username=${username}&length=1`
  }
}

export const register = async (req: Request, res: Response) => {
  const { email, username, password, gender } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    if(!hashedPassword) {
      return res.status(400).json({ error: "Failed to create user." });
    }
    const imageUrl = getImageUrl(gender, username)
    const newUser = await prisma.user.create({
      data: { email, username, passwordHash: hashedPassword, image: imageUrl},
      select: { id: true, email: true, name: true, role: true },
    });

    const token = generateToken(newUser.id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: "lax",
    });

    return res.status(201).json({message: "User created successfully", data: newUser});
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ error: "A user with this email already exists." });
    }
    console.error(error);
    return res.status(500).json({ error: "Failed to create user." });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = generateToken(user.id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: "lax",
    });

    return res.status(200).json({
      status: "success",
      message: "User login successfully!",
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Login failed." });
  }
};

export const logout = (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  console.log(userId)

  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  return res.status(200).json({ message: "Logged out successfully" });
};

export const getMe = async (req: Request, res: Response) => {
  return res.status(200).json(req.user);
};

export const changePassword = async (req: Request, res: Response) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  try {
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(401)
        .json({ error: "New password and confirm password should be same" });
    }

    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        error: "User not found!",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash!);
    if (!isMatch) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    if (!hashedPassword) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }
    // Update password in DB
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res
        .status(200)
        .json({
          message: "OTP sent successfully",
        });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedOTP = await bcrypt.hash(otp, 10);

    await prisma.otp.deleteMany({ where: { email: email } });
    await prisma.otp.create({
      data: {
        email: email,
        code: hashedOTP,
        expiresAt: new Date(Date.now() + 60 * 1000),
      },
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Gmail App Password
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP is ${otp}. It expires in 1 minutes.`,
    });

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Server error" });
  }
};

const _verifyOtp = async (email: string, otp: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("Invalid OTP!");
  }

  const storedOtp = await prisma.otp.findFirst({
    where: { email: email, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "desc" },
  });

  if (!storedOtp) {
    throw new Error("OTP expired.");
  }

  const isOtpValid = await bcrypt.compare(otp, storedOtp.code);
  if (!isOtpValid) {
    throw new Error("Invalid OTP!");
  }

  return storedOtp;
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required." });
  }
  try {
    await _verifyOtp(email, otp);
    return res.status(200).json({ message: "OTP verified successfully" });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const changeForgotPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword, confirmPassword } = req.body;
  if (!email || !otp || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .json({ error: "New password and confirm password must match." });
  }

  try {
    const storedOtp = await _verifyOtp(email, otp);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hashedPassword },
    });

    await prisma.otp.delete({ where: { id: storedOtp.id } });

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};