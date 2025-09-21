import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });
};
export const register = async (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: { email, name, passwordHash: hashedPassword },
            select: { id: true, email: true, name: true, role: true },
        });
        const token = generateToken(newUser.id);
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            sameSite: "lax",
        });
        return res.status(201).json(newUser);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002") {
            return res
                .status(409)
                .json({ error: "A user with this email already exists." });
        }
        console.error(error);
        return res.status(500).json({ error: "Failed to create user." });
    }
};
export const login = async (req, res) => {
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
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Login failed." });
    }
};
export const logout = (res) => {
    res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0),
    });
    res.status(200).json({ message: "Logged out successfully" });
};
//# sourceMappingURL=authController.js.map