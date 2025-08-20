import mongoose from "mongoose"
import dotenv from "dotenv"
dotenv.config()

export const dbConnect = async()=>{
    try {
        const url = process.env.MONGO_URI;
        if (!url) {
            throw new Error("MONGO_URI is not defined in .env file");
        }
        await mongoose.connect(url)
        console.log("connection to database successfull")
    } catch (error) {
        console.error("Problem while connecting to database " + error.message)
        process.exit(1);
    }
}