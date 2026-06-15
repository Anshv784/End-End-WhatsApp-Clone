import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { dbConnect } from "../lib/dbConnect.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { authRouter } from "../routes/authRoute.js";
import { chatRouter } from "../routes/chatRoute.js";
import initializeSocket from "../services/socketService.js";
import http from "http";
import {statusRouter} from "../routes/statusRoute.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

let allowedOrigins = ["http://localhost:3000"];
if (process.env.ACCESS_POINT) {
  try {
    const parsed = JSON.parse(process.env.ACCESS_POINT);
    allowedOrigins = Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    allowedOrigins = process.env.ACCESS_POINT.split(",").map(o => o.trim());
  }
}

const corsOptions = {
  origin: function (origin, callback) {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      (process.env.VERCEL && (origin.includes(".vercel.app") || origin.includes("localhost")))
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
// middlewares
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Database connection check middleware
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await dbConnect();
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Database connection failed. Please verify your MONGO_URI in Vercel settings and ensure MongoDB Atlas allows access from all IP addresses (0.0.0.0/0).",
        error: error.message,
      });
    }
  }
  next();
});


// create server
const server = http.createServer(app);
const io = initializeSocket(server);

app.use((req,res,next)=>{
  req.io = io;
  req.socketUserMap = io.socketUserMap;
  next();
})


// routes

app.use("/api/auth", authRouter);
app.use("/api/chat",chatRouter);
app.use("/api/status",statusRouter);

(async () => {
  try {
    await dbConnect();
    console.log("Database connected");

    if (!process.env.VERCEL) {
      server.listen(port, () => {
        console.log(`Listening on port: ${port}`);
      });
    }
  } catch (error) {
    console.error("Failed to connect to database:", error.message);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
})();

export default app;
