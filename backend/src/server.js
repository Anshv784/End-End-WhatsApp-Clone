import express from "express"
import dotenv from "dotenv"
import {dbConnect}  from "../lib/dbConnect.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.listen(port,async()=>{
    try {
        await dbConnect();
        console.log(`listening on port : ${port}`)
    } catch (error) {
        console.error("Failed to connect to database " + error.message);
        process.exit(1);
    }
} )