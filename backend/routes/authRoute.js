import express from "express"
import { getAllUsers, sendOtp,verifyOtp } from "../controllers/auth.controller.js"
import { authMiddleware, checkAuthenticated, logOut} from "../middlewares/authmiddleware.js";
import { multerMiddleware } from "../middlewares/multerMiddleware.js";
import { updateProfile } from "../controllers/auth.controller.js";

export const authRouter = express.Router();

authRouter.post('/send-otp',sendOtp);
authRouter.post('/verify-otp',verifyOtp);
authRouter.get('/log-out',logOut);


//protected routes
authRouter.put('/update-profile',authMiddleware,multerMiddleware,updateProfile);
authRouter.get('/check-auth',authMiddleware,checkAuthenticated);
authRouter.get('/users',authMiddleware,getAllUsers);