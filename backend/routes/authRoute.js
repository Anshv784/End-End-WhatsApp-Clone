import express from "express"
import { sendOtp,verifyOtp } from "../controllers/auth.controller.js"
import { authMiddleware} from "../middlewares/authmiddleware.js";
import { multerMiddleware } from "../middlewares/multerMiddleware.js";
import { updateProfile } from "../controllers/auth.controller.js";

export const authRouter = express.Router();

authRouter.post('/send-otp',sendOtp);
authRouter.post('/verify-otp',verifyOtp);

//protected routes
authRouter.put('/update-profile',authMiddleware,multerMiddleware,updateProfile);