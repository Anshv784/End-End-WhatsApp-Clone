import express from "express";
import dotenv from "dotenv";
import { dbConnect } from "../lib/dbConnect.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { authRouter } from "../routes/authRoute.js";
import { chatRouter } from "../routes/chatRoute.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

const accessPoints = ["http://localhost:3000"];

// middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: accessPoints,
  credentials: true
}));

// routes
app.use("/api/auth", authRouter);
app.use("/api/chat",chatRouter);

(async () => {
  try {
    await dbConnect();
    console.log("Database connected");

    app.listen(port, () => {
      console.log(`Listening on port: ${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to database:", error.message);
    process.exit(1);
  }
})();
