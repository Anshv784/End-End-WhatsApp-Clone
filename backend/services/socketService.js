import { Server } from "socket.io";
import User from "../models/user.model.js";
import Message from "../models/messages.model.js";

// Map to store online users -> userId , socketId
const onlineUsers = new Map();

// Map to track typing status -> userId -> { conversationId: boolean }
const typingUsers = new Map();

const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL,
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        },
        pingTimeout: 60000, // disconnect inactive users/sockets after 60s
    });

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id}`);
        let userId = null;

        // Handle user connection
        socket.on("user_connected", async (connectingUserId) => {
            try {
                userId = connectingUserId;
                onlineUsers.set(userId, socket.id);
                socket.join(userId); // join personal room for direct communication

                // update user status in db
                await User.findByIdAndUpdate(userId, {
                    isOnline: true,
                    lastSeen: new Date(),
                });

                // notify all users
                io.emit("user_status", { userId, isOnline: true });
            } catch (error) {
                console.error("Error handling user connection", error);
            }
        });

        // Return online status of requested user
        socket.on("get_user_status", (requestedUserId, callback) => {
            const isOnline = onlineUsers.has(requestedUserId);
            callback({
                userId: requestedUserId,
                isOnline,
                lastSeen: isOnline ? new Date() : null,
            });
        });

        // Forward message to receiver
        socket.on("send_message", async (message) => {
            try {
                const receiverSocketId = onlineUsers.get(message.receiver?._id);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("receive_message", message);
                }
            } catch (error) {
                console.error("Error sending message", error);
                socket.emit("message_error", { error: "Failed to send message" });
            }
        });

        // Update messages as read
        socket.on("message_read", async ({ messageIds, senderId }) => {
            try {
                await Message.updateMany(
                    { _id: { $in: messageIds } },
                    { $set: { messageStatus: "read" } }
                );

                const senderSocketId = onlineUsers.get(senderId);
                if (senderSocketId) {
                    messageIds.forEach((messageId) => {
                        io.to(senderSocketId).emit("message_status_update", {
                            messageId,
                            messageStatus: "read",
                        });
                    });
                }
            } catch (error) {
                console.error("Error updating message read status", error);
            }
        });

        // Typing start
        socket.on("typing_start", ({ conversationId, receiverId }) => {
            if (!userId || !conversationId || !receiverId) return;

            if (!typingUsers.has(userId)) typingUsers.set(userId, {});
            const userTyping = typingUsers.get(userId);

            userTyping[conversationId] = true;

            // auto stop typing after 3s
            if (userTyping[`${conversationId}_timeout`]) {
                clearTimeout(userTyping[`${conversationId}_timeout`]);
            }

            userTyping[`${conversationId}_timeout`] = setTimeout(() => {
                userTyping[conversationId] = false;
                socket.to(receiverId).emit("user_typing", {
                    userId,
                    conversationId,
                    isTyping: false,
                });
            }, 3000);

            // Notify receiver
            socket.to(receiverId).emit("user_typing", {
                userId,
                conversationId,
                isTyping: true,
            });
        });

        // Typing stop
        socket.on("typing_stop", ({ conversationId, receiverId }) => {
            if (!userId || !conversationId || !receiverId) return;

            if (typingUsers.has(userId)) {
                const userTyping = typingUsers.get(userId);
                userTyping[conversationId] = false;

                if (userTyping[`${conversationId}_timeout`]) {
                    clearTimeout(userTyping[`${conversationId}_timeout`]);
                    delete userTyping[`${conversationId}_timeout`];
                }
            }

            socket.to(receiverId).emit("user_typing", {
                userId,
                conversationId,
                isTyping: false,
            });
        });

        // Add or update reaction on message
        socket.on("add_reaction", async ({ messageId, emoji, userId, reactionUserId }) => {
            try {
                const message = await Message.findById(messageId);
                if (!message) return;

                const exitingIndex = message.reactions.findIndex(
                    (r) => r.user.toString() === reactionUserId
                );

                if (exitingIndex > -1) {
                    const exiting = message.reactions[exitingIndex];
                    if (exiting.emoji === emoji) {
                        // remove same reaction
                        message.reactions.splice(exitingIndex, 1);
                    } else {
                        // change emoji
                        message.reactions[exitingIndex].emoji = emoji;
                    }
                } else {
                    // add new reaction
                    message.reactions.push({ user: reactionUserId, emoji });
                }

                await message.save();

                const populatedMessage = await Message.findOne({ _id: message?._id })
                    .populate("sender", "username profilePicture")
                    .populate("receiver", "username profilePicture")
                    .populate("reactions.user", "username");

                const reactionUpdated = {
                    messageId,
                    reactions: populatedMessage.reactions,
                };

                const senderSocket = onlineUsers.get(populatedMessage.sender?._id.toString());
                const receiverSocket = onlineUsers.get(populatedMessage.receiver?._id.toString());

                if (senderSocket)
                    io.to(senderSocket).emit("reaction_update", reactionUpdated);

                if (receiverSocket)
                    io.to(receiverSocket).emit("reaction_update", reactionUpdated);

            } catch (error) {
                console.log("Error handling reaction", error);
            }
        });

        // Handle disconnect
        const handleDisconnected = async () => {
            if (!userId) return;

            try {
                onlineUsers.delete(userId);

                // clear all typing timers
                if (typingUsers.has(userId)) {
                    const userTyping = typingUsers.get(userId);
                    clearTimeout(userTyping.timer);
                    typingUsers.delete(userId);
                }

                await User.findByIdAndUpdate(userId, {
                    isOnline: false,
                    lastSeen: new Date(),
                });

                io.emit("user_status", {
                    userId,
                    isOnline: false,
                    lastSeen: new Date(),
                });

                socket.leave(userId);
                console.log(`user ${userId} disconnected`);
            } catch (error) {
                console.error("Error handling disconnection", error);
            }
        };

        socket.on("disconnect", handleDisconnected);
    });

    // attach the online user map to the socket server for external use
    io.socketUserMap = onlineUsers;

    return io;
};

export default initializeSocket;
