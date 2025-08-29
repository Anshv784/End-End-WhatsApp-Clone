import express from "express";
import dotenv from "dotenv";
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

const accessPoints = process.env.ACCESS_POINTS?.split(",") || [];

// middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: accessPoints,
  credentials: true
}));

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

    server.listen(port, () => {
      console.log(`Listening on port: ${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to database:", error.message);
    process.exit(1);
  }
})();
