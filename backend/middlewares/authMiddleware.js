import jwt from "jsonwebtoken"
import response from "../utils/responseHandler.js"
import dotenv from "dotenv"

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