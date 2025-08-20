import express from "express"
import { sendOtp, verifyOtp } from "../controllers/authcontroller.js";

export const authRouter = express.Router();

authRouter.post('/send-otp',sendOtp);
authRouter.post('/verify-otp',verifyOtp)