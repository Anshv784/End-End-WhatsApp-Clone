import jwt from "jsonwebtoken"
import response from "../utils/responseHandler.js"
import dotenv from "dotenv"
import User from "../models/user.model.js";

dotenv.config();

export const authMiddleware = (req,res,next)=>{
    const token = req.cookies?.auth_token;
    if(!token) return response(res,401,"authorization token is misssing!");

    try {
        const decoded = jwt.verify(token,process.env.JWT_SECRET);
        req.user = decoded;
        console.log(req.user);
        next();
    } catch (error) {
        console.error(error)
        return response(res,401,"Invalid or Expired token")
        
    }
}

export const checkAuthenticated = async(req,res)=>{
    try {
        const userId = req.user.userId;
        if(!userId) return response(res,404,"Unauthorization ! please login before access our app");
        const user = await User.findById(userid);
        if(!user) return response(res,404,"User Not found");

        return (res,400,"user retrived and allowed to use whatsapp", user);


    } catch (error) {
        console.error(error)
        return response(res,500,"Internal server error");
    }
}

export const logOut = (req,res)=>{
    try {
        res.cookie("auth_token","",{expires:new Date(0)})
        return response(res,200,"user logout successfully")
    } catch (error) {
        console.error(error)
        return response(res,500,"Internal. Server Error")
    }
}