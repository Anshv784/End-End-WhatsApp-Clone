import express from "express"
import { createStatus ,getStatus,viewStatus,deleteStatus} from "../controllers/status.controller.js";
import { authMiddleware } from "../middlewares/authmiddleware.js";
import { multerMiddleware } from "../middlewares/multerMiddleware.js";

export const statusRouter = express.Router();

// protected route
statusRouter.post("/",authMiddleware,multerMiddleware,createStatus);
statusRouter.get("/", authMiddleware, getStatus);
statusRouter.put("/:statusId/view", authMiddleware,viewStatus);
statusRouter.delete("/:statusId",authMiddleware,deleteStatus);
