import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRouter from "./routes/authRoutes";
// Initialize the Express application
const app = express();
const PORT = 8080;
const options = {
    origin: "http:localhost:3000",
};
app.use(express.json());
app.use(cookieParser());
app.use(cors(options));
// Define a route handler for the root URL ('/')
app.get("/", (_req, res) => {
    // Send a JSON response
    return res.status(200).json({ Hello: "World" });
});
app.use("/api/v1/auth", authRouter);
// Start the server and listen for connections on the specified port
app.listen(PORT, () => {
    console.log(`[server]: Server running at http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map