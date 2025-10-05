import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "@/config/prisma";

const generateToken = (id: string, email: string, role: "ADMIN") => {
  return jwt.sign({ id, email, role }, process.env.JWT_SECRET as string, {
    expiresIn: "1h",
  });
};

export const loginAdmin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.passwordHash!);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(admin.id, admin.email, "ADMIN");
    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 1000,
      sameSite: "lax",
    });

    return res.status(200).json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const changeAdminPassword = async (req: Request, res: Response) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  if (newPassword !== confirmPassword) {
    return res
      .status(401)
      .json({ error: "New password and confirm password should be same" });
  }
  if (oldPassword === newPassword) {
    return res
      .status(401)
      .json({ error: "Old password and new password shouldn't be same" });
  }

  try {
    const adminId = (req as any).admin?.id;
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return res.status(404).json({
        error: "Admin not found!",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, admin.passwordHash!);
    if (!isMatch) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in DB
    await prisma.admin.update({
      where: { id: adminId },
      data: { passwordHash: hashedPassword },
    });

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};
