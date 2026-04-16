import { create } from "zustand";
import { axiosInstance } from "../services/url.service";
import { getSocket } from "../utils/socket";

const useChatStore = create((set, get) => ({

  currentUser: null,
  conversations: [],
  currentConversation: null,
  messages: [],
  onlineUsers: new Map(),
  typingUsers: new Map(),
  loading: false,
  error: null,

  setCurrentUser: (user) => set({ currentUser: user }),

  initSocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    // update message status
    socket.on("message_status_update", ({ messageId, messageStatus }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, messageStatus } : msg
        ),
      }));
    });

    // handle reaction update
    socket.on("reaction_update", ({ messageId, reactions }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg
        ),
      }));
    });

    // handle message delete
    socket.on("message_deleted", ({ deletedMessageId }) => {
      set((state) => ({
        messages: state.messages.filter(
          (msg) => msg._id !== deletedMessageId
        ),
      }));
    });

    // error
    socket.on("message_error", (error) => {
      console.error("message error", error);
    });

    // typing
    socket.on("user_typing", ({ userId, conversationId, isTyping }) => {
      set((state) => {
        const newTypingUsers = new Map(state.typingUsers);

        if (!newTypingUsers.has(conversationId)) {
          newTypingUsers.set(conversationId, new Set());
        }

        const typingSet = newTypingUsers.get(conversationId);

        if (isTyping) typingSet.add(userId);
        else typingSet.delete(userId);

        return { typingUsers: newTypingUsers };
      });
    });

    // online status
    socket.on("user_status", ({ userId, isOnline, lastSeen }) => {
      set((state) => {
        const newOnlineUsers = new Map(state.onlineUsers);
        newOnlineUsers.set(userId, { isOnline, lastSeen });
        return { onlineUsers: newOnlineUsers };
      });
    });
  },

  fetchConversations: async () => {
    set({ loading: true, error: null });

    try {
      const { data } = await axiosInstance.get("/chats/conversations");
      set({ conversations: data, loading: false });

      get().initSocketListeners();

      return data;
    } catch (error) {
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
      });
      return null;
    }
  },

  fetchMessages: async (conversationId) => {
    if (!conversationId) return;

    set({ loading: true, error: null });

    try {
      const { data } = await axiosInstance.get(
        `/chats/conversations/${conversationId}/messages`
      );

      const messageArray = data?.data || data || [];

      set({
        messages: messageArray,
        currentConversation: conversationId,
        loading: false,
      });

      return messageArray;
    } catch (error) {
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
      });
      return [];
    }
  },

  receiveMessage: (message) => {
    if (!message) return;

    const { currentConversation, currentUser, messages } = get();

    const messageExists = messages.some(
      (msg) => msg._id === message._id
    );
    if (messageExists) return;

    if (message.conversation === currentConversation) {
      set((state) => ({
        messages: [...state.messages, message],
      }));
    }

    // update conversation preview
    set((state) => {
      const updateConversations = state.conversations?.data?.map((conv) => {
        if (conv._id === message.conversation) {
          return {
            ...conv,
            lastMessage: message,
            unreadCount:
              message?.receiver?._id === currentUser?._id
                ? (conv.unreadCount || 0) + 1
                : conv.unreadCount || 0,
          };
        }
        return conv;
      });

      return {
        conversations: {
          ...state.conversations,
          data: updateConversations,
        },
      };
    });

    // auto mark as read
    if (message.receiver?._id === currentUser?._id) {
      get().maskMessagesAsRead();
    }
  },

  maskMessagesAsRead: async () => {
    const { messages, currentUser } = get();

    if (!messages.length || !currentUser) return;

    const unreadIds = messages
      .filter(
        (msg) =>
          msg.messageStatus !== "read" &&
          msg.receiver?._id === currentUser?._id
      )
      .map((msg) => msg._id)
      .filter(Boolean);

    if (unreadIds.length === 0) return;

    try {
      await axiosInstance.put("/chats/messages/read", {
        messageIds: unreadIds,
      });

      set((state) => ({
        messages: state.messages.map((msg) =>
          unreadIds.includes(msg._id)
            ? { ...msg, messageStatus: "read" }
            : msg
        ),
      }));

      const socket = getSocket();
      if (socket) {
        socket.emit("message_read", {
          messageIds: unreadIds,
          senderId: messages[0]?.sender?._id,
        });
      }
    } catch (error) {
      console.error("failed to mark message as read", error);
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/chats/messages/${messageId}`);

      set((state) => ({
        messages: state.messages.filter(
          (msg) => msg._id !== messageId
        ),
      }));

      return true;
    } catch (error) {
      console.log("error deleting message", error);
      set({
        error: error?.response?.data?.message || error?.message,
      });
      return false;
    }
  },

  addReaction: async (messageId, emoji) => {
    const socket = getSocket();
    const { currentUser } = get();

    if (socket && currentUser) {
      socket.emit("add_reaction", {
        messageId,
        emoji,
        userId: currentUser?._id,
      });
    }
  },

  startTyping: (receiverId) => {
    const socket = getSocket();
    const { currentConversation } = get();

    if (socket && currentConversation && receiverId) {
      socket.emit("typing_start", {
        conversationId: currentConversation,
        receiverId,
      });
    }
  },

  stopTyping: (receiverId) => {
    const socket = getSocket();
    const { currentConversation } = get();

    if (socket && currentConversation && receiverId) {
      socket.emit("typing_stop", {
        conversationId: currentConversation,
        receiverId,
      });
    }
  },

  isUserTyping: (userId) => {
    const { typingUsers, currentConversation } = get();

    if (
      !currentConversation ||
      !typingUsers.has(currentConversation) ||
      !userId
    )
      return false;

    return typingUsers.get(currentConversation).has(userId);
  },

  isUserOnline: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.isOnline || false;
  },

  getUserLastSeen: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.lastSeen || null;
  },

  cleanup: () => {
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      onlineUsers: new Map(),
      typingUsers: new Map(),
    });
  },

}));


