import express from "express";
// Explicitly import types using the `import type` syntax.
// This makes it clear to the compiler that these are not runtime values.
import type { Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors, { CorsOptions } from "cors";
import authRouter from "./routes/authRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import accountRouter from "./routes/accountRoutes.js";
import eventRouter from "./routes/eventRoutes.js";
import { Server } from "socket.io";
import { createServer } from "http";
import { initializeSocket } from "./utils/socketHandler.js";
import userRouter from "./routes/userRoutes.js";
import transactionRouter from "./routes/transactionRoutes.js";

// Initialize the Express application
const app = express();
const PORT: number = 8080;

const options: CorsOptions = {
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
};

app.use(express.json());
app.use(cookieParser());
app.use(cors(options));

// Define a route handler for the root URL ('/')
app.get("/", (_req: Request, res: Response) => {
  // Send a JSON response
  return res.status(200).json({ Hello: "World" });
});

app.use("/api/v1/user/auth", authRouter);
app.use("/api/v1/admin/auth", adminRouter);
app.use("/api/v1/admin/account", accountRouter);
app.use("/api/v1/user/events", eventRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/transactions", transactionRouter)

const httpServer = createServer(app);

const io = new Server(httpServer, {
  // 3. Configure CORS to allow your frontend origin
  cors: {
    origin: [process.env.CLIENT_URL || "http://localhost:3000", "http://localhost:3001"], // Your Next.js app URL
    methods: ["GET", "POST"],
  },
});

initializeSocket(io);

// Start the server and listen for connections on the specified port
httpServer.listen(PORT, () => {
  console.log(`[server]: Server running at http://localhost:${PORT}`);
});
