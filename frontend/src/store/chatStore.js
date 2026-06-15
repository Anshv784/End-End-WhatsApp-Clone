import { create } from "zustand";
import { axiosInstance } from "../services/url.service";
import { getSocket } from "../utils/socket";
import { getAllUsers } from "../services/user.service";
import useUserStore from "./userStore";

const useChatStore = create((set, get) => ({

  currentUser: null,
  conversations: [],
  currentConversation: null,
  messages: [],
  onlineUsers: new Map(),
  typingUsers: new Map(),
  users: [],
  socketListenersInitialized: false,
  loading: false,
  error: null,

  setCurrentUser: (user) => set({ currentUser: user }),

  initSocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;
    if (get().socketListenersInitialized) return;

    socket.off("receive_message");
    socket.off("message_status_update");
    socket.off("reaction_update");
    socket.off("message_deleted");
    socket.off("message_error");
    socket.off("user_typing");
    socket.off("user_status");

    // receive message
    socket.on("receive_message", (message) => {
      get().receiveMessage(message);
    });

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
    socket.on("message_deleted", (deletedMessageId) => {
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
        const currentSet = newTypingUsers.get(conversationId) || new Set();
        const newSet = new Set(currentSet);

        if (isTyping) newSet.add(userId);
        else newSet.delete(userId);

        newTypingUsers.set(conversationId, newSet);

        return { typingUsers: newTypingUsers };
      });
    });

    // online status
    socket.on("user_status", ({ userId, isOnline, lastSeen }) => {
      set((state) => {
        const newOnlineUsers = new Map(state.onlineUsers);
        newOnlineUsers.set(String(userId), { isOnline, lastSeen });
        return { onlineUsers: newOnlineUsers };
      });
    });

    set({ socketListenersInitialized: true });
  },

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const response = await getAllUsers();
      if (response.status === "success") {
        const sortedUsers = [...response.data].sort((a, b) => {
          const timeA = a.conversation?.lastMessage?.createdAt ? new Date(a.conversation.lastMessage.createdAt) : 0;
          const timeB = b.conversation?.lastMessage?.createdAt ? new Date(b.conversation.lastMessage.createdAt) : 0;
          return timeB - timeA;
        });
        set({ users: sortedUsers, loading: false });
      } else {
        set({ loading: false });
      }
      get().initSocketListeners();
    } catch (error) {
      set({
        error: error?.message || "Failed to fetch users",
        loading: false,
      });
    }
  },

  fetchConversations: async () => {
    set({ loading: true, error: null });

    try {
      const { data } = await axiosInstance.get("/chat/conversations");
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
        `/chat/conversations/${conversationId}/messages`
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

    const { currentConversation, messages } = get();
    const currentUser = useUserStore.getState().user;

    const messageExists = messages.some(
      (msg) => msg._id === message._id
    );
    if (messageExists) return;

    const msgConvId = String(message.conversation?._id || message.conversation || "");
    const curConvId = String(currentConversation || "");
    if (msgConvId && curConvId && msgConvId === curConvId) {
      set((state) => ({
        messages: [...state.messages, message],
      }));
    }

    // update user list (contacts) in real time
    set((state) => {
      const updatedUsers = state.users.map((u) => {
        const isTargetUser =
          (message.sender?._id === u._id && message.receiver?._id === currentUser?._id) ||
          (message.receiver?._id === u._id && message.sender?._id === currentUser?._id) ||
          (message.sender === u._id && message.receiver === currentUser?._id) ||
          (message.receiver === u._id && message.sender === currentUser?._id);

        if (isTargetUser) {
          const prevConv = u.conversation || {};
          return {
            ...u,
            conversation: {
              ...prevConv,
              _id: message.conversation,
              lastMessage: message,
              unreadCount:
                message.receiver === currentUser?._id || message.receiver?._id === currentUser?._id
                  ? (prevConv.unreadCount || 0) + 1
                  : prevConv.unreadCount || 0,
            },
          };
        }
        return u;
      });

      const sortedUsers = [...updatedUsers].sort((a, b) => {
        const timeA = a.conversation?.lastMessage?.createdAt ? new Date(a.conversation.lastMessage.createdAt) : 0;
        const timeB = b.conversation?.lastMessage?.createdAt ? new Date(b.conversation.lastMessage.createdAt) : 0;
        return timeB - timeA;
      });

      return { users: sortedUsers };
    });

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
    if (message.receiver?._id === currentUser?._id || message.receiver === currentUser?._id) {
      get().maskMessagesAsRead();
    }
  },

  maskMessagesAsRead: async () => {
    const { messages, currentConversation } = get();
    const currentUser = useUserStore.getState().user;

    if (!messages.length || !currentUser) return;

    const unreadIds = messages
      .filter(
        (msg) =>
          msg.messageStatus !== "read" &&
          (msg.receiver?._id === currentUser?._id || msg.receiver === currentUser?._id)
      )
      .map((msg) => msg._id)
      .filter(Boolean);

    if (unreadIds.length === 0) return;

    try {
      await axiosInstance.put("/chat/messages/read", {
        messageIds: unreadIds,
      });

      set((state) => ({
        messages: state.messages.map((msg) =>
          unreadIds.includes(msg._id)
            ? { ...msg, messageStatus: "read" }
            : msg
        ),
        users: state.users.map((u) => {
          if (u.conversation?._id === currentConversation) {
            return {
              ...u,
              conversation: {
                ...u.conversation,
                unreadCount: 0,
              },
            };
          }
          return u;
        }),
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
      await axiosInstance.delete(`/chat/messages/${messageId}`);

      set((state) => ({
        messages: state.messages.filter(
          (msg) => msg._id !== messageId
        ),
      }));

      return true;
    } catch (error) {
      console.error("error deleting message", error);
      set({
        error: error?.response?.data?.message || error?.message,
      });
      return false;
    }
  },

  addReaction: async (messageId, emoji) => {
    const socket = getSocket();
    const currentUser = useUserStore.getState().user;

    if (socket && currentUser) {
      socket.emit("add_reaction", {
        messageId,
        emoji,
        userId: currentUser?._id,
        reactionUserId: currentUser?._id,
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
      users: [],
      socketListenersInitialized: false,
    });
  },
}));

export default useChatStore;


