import mongoose from "mongoose"
import dotenv from "dotenv"
dotenv.config()

export const dbConnect = async()=>{
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
        return;
    }
    try {
        const url = process.env.MONGO_URI;
        
        if (!url) {
            throw new Error("MONGO_URI is not defined in .env file");
        }
        await mongoose.connect(url)
    } catch (error) {
        console.error("Problem while connecting to database " + error.message)
        if (!process.env.VERCEL) {
            process.exit(1);
        } else {
            throw error;
        }
    }
}