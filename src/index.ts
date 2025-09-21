import express from "express";
// Explicitly import types using the `import type` syntax.
// This makes it clear to the compiler that these are not runtime values.
import type { Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors, { CorsOptions } from "cors";
import authRouter from "./routes/authRoutes.js";

// Initialize the Express application
const app = express();
const PORT: number = 8080;

const options: CorsOptions = {
  origin: "http:localhost:3000",
};

app.use(express.json());
app.use(cookieParser());
app.use(cors(options));

// Define a route handler for the root URL ('/')
app.get("/", (_req: Request, res: Response) => {
  // Send a JSON response
  return res.status(200).json({ Hello: "World" });
});

app.use("/api/v1/auth", authRouter);

// Start the server and listen for connections on the specified port
app.listen(PORT, () => {
  console.log(`[server]: Server running at http://localhost:${PORT}`);
});
