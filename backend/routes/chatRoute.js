import express from "express"
import { sendMessage,getConversation,getMessages,deleteMessage,markAsRead} from "../controllers/chat.controller.js"
import { authMiddleware } from "../middlewares/authmiddleware.js";
import { multerMiddleware } from "../middlewares/multerMiddleware.js";

export const chatRouter = express.Router();

// protected route
chatRouter.post("/send-message",authMiddleware,multerMiddleware,sendMessage);
chatRouter.get("/conversations", authMiddleware, getConversation);
chatRouter.get("/conversations/:conversationId/messages",authMiddleware,getMessages);
chatRouter.put("/messages/read", authMiddleware,markAsRead);
chatRouter.delete("/messages/:messageId",authMiddleware,deleteMessage);
