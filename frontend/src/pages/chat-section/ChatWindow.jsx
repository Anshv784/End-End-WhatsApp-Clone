import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowLeft,
  FaPaperPlane,
  FaImage,
  FaSmile,
  FaTimes,
  FaTrash,
  FaCheck,
  FaCheckDouble,
  FaEllipsisV,
  FaUserCircle,
} from "react-icons/fa";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/userStore";
import useChatStore from "../../store/chatStore";
import useLayoutStore from "../../store/layoutStore";
import { axiosInstance } from "../../services/url.service";
import { getSocket } from "../../utils/socket";
import formatTimestamp from "../../utils/FormatTimestamp";

const EMOJI_LIST = [
  "👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "🎉", "👏", "🙏",
  "💯", "✨", "😍", "🤔", "👀", "💪", "😊", "🥳", "😎", "🤣",
];

const ChatWindow = ({ selectedContact, setSelectedContact, isMobile }) => {
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const {
    messages,
    fetchMessages,
    receiveMessage,
    maskMessagesAsRead,
    deleteMessage,
    addReaction,
    startTyping,
    stopTyping,
    isUserTyping,
    isUserOnline,
    getUserLastSeen,
    setCurrentUser,
    loading,
  } = useChatStore();

  const [messageText, setMessageText] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageContainerRef = useRef(null);

  const isDark = theme === "dark";

  // Set current user for chatStore
  useEffect(() => {
    if (user) setCurrentUser(user);
  }, [user, setCurrentUser]);

  // Fetch messages when contact is selected
  useEffect(() => {
    if (selectedContact?.conversation?._id) {
      fetchMessages(selectedContact.conversation._id);
    }
  }, [selectedContact, fetchMessages]);

  // Socket: listener is managed globally in App.jsx / chatStore

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (messages.length > 0 && selectedContact) {
      maskMessagesAsRead();
    }
  }, [messages, selectedContact, maskMessagesAsRead]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setShowReactionPicker(null);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Handle typing indicators
  const handleTyping = useCallback((value) => {
    if (!selectedContact?._id) return;

    if (!value || value.trim() === "") {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      stopTyping(selectedContact._id);
      return;
    }

    startTyping(selectedContact._id);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(selectedContact._id);
    }, 2000);
  }, [selectedContact, startTyping, stopTyping]);

  // Send message
  const handleSendMessage = async () => {
    if ((!messageText.trim() && !mediaFile) || sending) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("senderId", user._id);
      formData.append("receiverId", selectedContact._id);
      formData.append("content", messageText.trim());
      formData.append("messageStatus", "send");

      if (mediaFile) {
        formData.append("media", mediaFile);
      }

      const { data } = await axiosInstance.post("/chat/send-message", formData);
      const sentMessage = data?.data || data;

      // Update currentConversation and selectedContact conversation ID if it was new/null!
      if (!selectedContact?.conversation?._id) {
        const updatedContact = {
          ...selectedContact,
          conversation: {
            ...selectedContact.conversation,
            _id: sentMessage.conversation,
          },
        };
        setSelectedContact(updatedContact);
        useChatStore.setState({ currentConversation: sentMessage.conversation });
      }

      // Add to local messages
      receiveMessage(sentMessage);

      // Server already emits to receiver via HTTP controller

      setMessageText("");
      setMediaFile(null);
      setMediaPreview(null);
      setShowEmojiPicker(false);

      // Stop typing
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping(selectedContact._id);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  // Handle delete
  const handleDelete = async (messageId) => {
    await deleteMessage(messageId);
    setContextMenu(null);
  };

  // Handle reaction
  const handleReaction = (messageId, emoji) => {
    addReaction(messageId, emoji);
    setShowReactionPicker(null);
  };

  // Context menu
  const handleContextMenu = (e, message) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 180),
      y: Math.min(e.clientY, window.innerHeight - 120),
      message,
    });
  };

  // Get online/last seen text
  const getStatusText = () => {
    if (!selectedContact?._id) return "";
    const online = isUserOnline(selectedContact._id);
    if (online) return "online";
    const lastSeen = getUserLastSeen(selectedContact._id) || selectedContact?.lastSeen;
    if (lastSeen) return `last seen ${formatTimestamp(lastSeen)}`;
    return "";
  };

  // Message status icon
  const MessageStatus = ({ status }) => {
    if (status === "read") {
      return <FaCheckDouble className="text-blue-400 text-xs" />;
    }
    if (status === "delivered") {
      return <FaCheckDouble className="text-gray-400 text-xs" />;
    }
    return <FaCheck className="text-gray-400 text-xs" />;
  };

  // Typing indicator
  const isContactTyping = selectedContact?._id
    ? isUserTyping(selectedContact._id)
    : false;

  // Empty state (no contact selected)
  if (!selectedContact) {
    return (
      <div
        className={`h-full flex flex-col items-center justify-center ${isDark ? "bg-[#222e35]" : "bg-[#f0f2f5]"
          }`}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="w-72 h-72 mx-auto mb-6 flex items-center justify-center">
            <svg viewBox="0 0 303 172" width="250" className={isDark ? "opacity-30" : "opacity-20"}>
              <path
                fill={isDark ? "#364147" : "#DAF7C3"}
                d="M229.565 160.229c32.647-16.166 55.007-51.095 52.721-86.665C279.376 33.157 244.455 3.17 206.236.478c-28.597-2.013-55.597 9.957-72.267 31.476C118.058 13.96 96.158 3.406 71.716 4.146 34.563 5.233 1.048 36.34.048 73.506c-.478 17.77 5.756 34.456 16.19 47.73a92.06 92.06 0 0 0 3.298 4.082c4.15 4.901 9.086 9.659 14.869 13.492 12.116 8.037 25.538 13.462 39.66 16.03 15.753 2.866 32.174 2.281 47.828-1.555 9.164-2.248 17.998-5.79 26.15-10.669 4.656-2.786 9.045-5.972 13.143-9.449 1.044.696 2.121 1.336 3.225 1.932a120.71 120.71 0 0 0 24.794 10.236 116.76 116.76 0 0 0 15.699 3.588c5.356.873 10.86 1.37 16.504 1.37 2.32 0 4.672-.105 7.035-.32-.089.003-.18.005-.27.005l.001-.002Z"
              />
            </svg>
          </div>
          <h2
            className={`text-3xl font-light mb-3 ${isDark ? "text-[#e9edef]" : "text-gray-700"
              }`}
          >
            WhatsApp Web
          </h2>
          <p
            className={`text-sm max-w-md ${isDark ? "text-[#8696a0]" : "text-gray-500"
              }`}
          >
            Send and receive messages without keeping your phone online.
            <br />
            Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full min-h-0 ${isDark ? "bg-[#0b141a]" : "bg-[#efeae2]"
        }`}
    >
      {/* Header */}
      <div
        className={`flex items-center px-4 py-3 shadow-sm ${isDark ? "bg-[#202c33]" : "bg-[#f0f2f5]"
          }`}
      >
        {isMobile && (
          <button
            onClick={() => setSelectedContact(null)}
            className={`mr-3 p-1 ${isDark ? "text-[#aebac1]" : "text-gray-600"}`}
          >
            <FaArrowLeft />
          </button>
        )}

        {selectedContact?.profilePicture ? (
          <img
            src={selectedContact.profilePicture}
            alt={selectedContact.username}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <FaUserCircle
            className={`w-10 h-10 ${isDark ? "text-[#aebac1]" : "text-gray-400"}`}
          />
        )}

        <div className="ml-3 flex-1">
          <h3
            className={`font-semibold text-base ${isDark ? "text-[#e9edef]" : "text-gray-900"
              }`}
          >
            {selectedContact?.username || "Unknown"}
          </h3>
          <p className={`text-xs ${isDark ? "text-[#8696a0]" : "text-gray-500"}`}>
            {isContactTyping ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-green-500 italic"
              >
                typing...
              </motion.span>
            ) : (
              getStatusText()
            )}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-16 py-4 space-y-1"
        style={{
          backgroundImage: isDark
            ? "none"
            : "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c5c5c5' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      >
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className={`w-8 h-8 border-2 border-t-transparent rounded-full ${isDark ? "border-[#00a884]" : "border-green-500"
                }`}
            />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm px-4 py-2 rounded-lg ${isDark ? "bg-[#182229] text-[#8696a0]" : "bg-white text-gray-500"
                } shadow-sm`}
            >
              No messages yet. Say hello! 👋
            </motion.p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isSender = msg?.sender?._id === user?._id;
            const showDate =
              index === 0 ||
              new Date(msg.createdAt).toDateString() !==
              new Date(messages[index - 1]?.createdAt).toDateString();

            return (
              <div key={msg._id || index}>
                {/* Date separator */}
                {showDate && (
                  <div className="flex justify-center my-3">
                    <span
                      className={`text-xs px-3 py-1 rounded-lg shadow-sm ${isDark
                          ? "bg-[#182229] text-[#8696a0]"
                          : "bg-white text-gray-500"
                        }`}
                    >
                      {new Date(msg.createdAt).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}

                {/* Message bubble */}
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isSender ? "justify-end" : "justify-start"} mb-1`}
                >
                  <div
                    className={`relative max-w-[75%] md:max-w-[65%] rounded-lg px-3 py-2 shadow-sm group ${isSender
                        ? isDark
                          ? "bg-[#005c4b] text-[#e9edef]"
                          : "bg-[#d9fdd3] text-gray-900"
                        : isDark
                          ? "bg-[#202c33] text-[#e9edef]"
                          : "bg-white text-gray-900"
                      }`}
                    onContextMenu={(e) => handleContextMenu(e, msg)}
                  >
                    {/* Media content */}
                    {msg.imageOrVideoUrl && (
                      <div className="mb-2 rounded-md overflow-hidden">
                        {msg.contentType === "video" ? (
                          <div className="relative">
                            <video
                              src={msg.imageOrVideoUrl}
                              className="max-w-full rounded-md max-h-72"
                              controls
                            />
                          </div>
                        ) : (
                          <img
                            src={msg.imageOrVideoUrl}
                            alt="Media"
                            className="max-w-full rounded-md max-h-72 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(msg.imageOrVideoUrl, "_blank")}
                          />
                        )}
                      </div>
                    )}

                    {/* Text content */}
                    {msg.content && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    )}

                    {/* Timestamp + status */}
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 ${isDark ? "text-[#ffffff99]" : "text-gray-500"
                        }`}
                    >
                      <span className="text-[11px]">
                        {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                      {isSender && <MessageStatus status={msg.messageStatus} />}
                    </div>

                    {/* Reactions */}
                    {msg.reactions?.length > 0 && (
                      <div
                        className={`absolute -bottom-3 ${isSender ? "left-1" : "right-1"
                          } flex gap-0.5`}
                      >
                        <div
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs shadow-sm ${isDark ? "bg-[#202c33]" : "bg-white"
                            }`}
                        >
                          {msg.reactions.slice(0, 3).map((r, i) => (
                            <span key={i}>{r.emoji}</span>
                          ))}
                          {msg.reactions.length > 3 && (
                            <span className={`text-[10px] ${isDark ? "text-[#8696a0]" : "text-gray-500"}`}>
                              +{msg.reactions.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Hover actions */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowReactionPicker(
                          showReactionPicker === msg._id ? null : msg._id
                        );
                        setContextMenu(null);
                      }}
                      className={`absolute -top-2 ${isSender ? "left-0" : "right-0"
                        } opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full shadow-sm ${isDark ? "bg-[#202c33] text-[#aebac1]" : "bg-white text-gray-500"
                        }`}
                    >
                      <FaSmile className="text-xs" />
                    </button>

                    {/* Reaction picker */}
                    <AnimatePresence>
                      {showReactionPicker === msg._id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: 10 }}
                          className={`absolute bottom-full ${isSender ? "right-0" : "left-0"
                            } mb-2 flex gap-1 p-2 rounded-2xl shadow-lg z-30 ${isDark ? "bg-[#233138]" : "bg-white"
                            }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {EMOJI_LIST.slice(0, 6).map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg._id, emoji)}
                              className="hover:scale-125 transition-transform text-xl p-1"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Spacing for reactions */}
                {msg.reactions?.length > 0 && <div className="h-3" />}
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {isContactTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex justify-start mb-1"
            >
              <div
                className={`rounded-lg px-4 py-3 shadow-sm ${isDark ? "bg-[#202c33]" : "bg-white"
                  }`}
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -5, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.6,
                        delay: i * 0.15,
                      }}
                      className={`w-2 h-2 rounded-full ${isDark ? "bg-[#8696a0]" : "bg-gray-400"
                        }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed z-50 rounded-lg shadow-xl overflow-hidden ${isDark ? "bg-[#233138]" : "bg-white"
              }`}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowReactionPicker(contextMenu.message._id);
                setContextMenu(null);
              }}
              className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 ${isDark
                  ? "hover:bg-[#182229] text-[#e9edef]"
                  : "hover:bg-gray-100 text-gray-700"
                }`}
            >
              <FaSmile /> React
            </button>
            {contextMenu.message?.sender?._id === user?._id && (
              <button
                onClick={() => handleDelete(contextMenu.message._id)}
                className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 text-red-500 ${isDark ? "hover:bg-[#182229]" : "hover:bg-gray-100"
                  }`}
              >
                <FaTrash /> Delete
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media preview */}
      <AnimatePresence>
        {mediaPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`px-4 py-2 ${isDark ? "bg-[#202c33]" : "bg-[#f0f2f5]"}`}
          >
            <div className="relative inline-block">
              {mediaFile?.type?.startsWith("video") ? (
                <video
                  src={mediaPreview}
                  className="h-20 rounded-lg"
                  muted
                />
              ) : (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="h-20 rounded-lg object-cover"
                />
              )}
              <button
                onClick={() => {
                  setMediaFile(null);
                  setMediaPreview(null);
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <FaTimes className="text-xs" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`px-4 py-3 ${isDark ? "bg-[#202c33]" : "bg-[#f0f2f5]"}`}
          >
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setMessageText((prev) => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="text-2xl hover:scale-110 transition-transform p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div
        className={`flex items-center gap-2 px-4 py-3 ${isDark ? "bg-[#202c33]" : "bg-[#f0f2f5]"
          }`}
      >
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2 rounded-full transition-colors ${isDark
              ? "text-[#8696a0] hover:text-[#e9edef]"
              : "text-gray-500 hover:text-gray-700"
            }`}
        >
          <FaSmile className="text-xl" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className={`p-2 rounded-full transition-colors ${isDark
              ? "text-[#8696a0] hover:text-[#e9edef]"
              : "text-gray-500 hover:text-gray-700"
            }`}
        >
          <FaImage className="text-xl" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        <input
          type="text"
          value={messageText}
          onChange={(e) => {
            setMessageText(e.target.value);
            handleTyping(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type a message"
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm focus:outline-none ${isDark
              ? "bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0]"
              : "bg-white text-gray-900 placeholder-gray-400"
            }`}
        />

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSendMessage}
          disabled={sending || (!messageText.trim() && !mediaFile)}
          className={`p-2.5 rounded-full transition-colors ${messageText.trim() || mediaFile
              ? isDark
                ? "bg-[#00a884] text-white hover:bg-[#06cf9c]"
                : "bg-green-500 text-white hover:bg-green-600"
              : isDark
                ? "text-[#8696a0]"
                : "text-gray-400"
            }`}
        >
          <FaPaperPlane className="text-lg" />
        </motion.button>
      </div>
    </div>
  );
};

export default ChatWindow;