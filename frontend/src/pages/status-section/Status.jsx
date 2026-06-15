import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import useUserStore from "../../store/userStore";
import useThemeStore from "../../store/themeStore";
import {
  createStatus,
  getAllStatuses,
  viewStatus,
  deleteStatus,
} from "../../services/status.service";
import { getSocket } from "../../services/chat.service";
import { toast } from "react-toastify";
import {
  FaPlus,
  FaTrash,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaFont,
  FaImage,
  FaUserCircle,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import formatTimestamp from "../../utils/FormatTimestamp";
import Spinner from "../../components/Spinner";

// Available background colors for text statuses
const BG_COLORS = [
  "#128c7e", // Teal
  "#9c27b0", // Purple
  "#e91e63", // Pink
  "#3f51b5", // Indigo
  "#00bcd4", // Cyan
  "#ff5722", // Orange
  "#4caf50", // Green
  "#202c33", // Dark Grey
];

// Helper to extract viewer user ID from new schema
const getViewerUserId = (viewer) => {
  if (viewer?.user?._id) return viewer.user._id;
  if (viewer?.user) return typeof viewer.user === 'string' ? viewer.user : viewer.user;
  if (viewer?._id) return viewer._id;
  return viewer;
};

const Status = () => {
  const { user: currentUser } = useUserStore();
  const { theme } = useThemeStore();

  const [allStatuses, setAllStatuses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Status Creation States
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [textBgColor, setTextBgColor] = useState(BG_COLORS[0]);

  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);

  // Status Viewer States
  const [activeViewerGroup, setActiveViewerGroup] = useState(null); // { user, statuses }
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef(null);
  const isPausedRef = useRef(false);
  const isViewerListOpenRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isViewerListOpen, setIsViewerListOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(5);
  const [selectedStatusForViewers, setSelectedStatusForViewers] = useState(null);

  useEffect(() => {
    isViewerListOpenRef.current = isViewerListOpen;
  }, [isViewerListOpen]);

  useEffect(() => {
    setIsViewerListOpen(false);
    setIsPaused(false);
    isPausedRef.current = false;
  }, [activeViewerGroup, activeStatusIndex]);

  // Load Statuses initially
  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const res = await getAllStatuses();
      if (res.status === "success") {
        setAllStatuses(res.data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load statuses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  // Socket Integration
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewStatus = (newStatus) => {
      setAllStatuses((prev) => {
        if (prev.some((s) => s._id === newStatus._id)) return prev;
        return [newStatus, ...prev];
      });
    };

    const handleStatusDeleted = (statusId) => {
      setAllStatuses((prev) => prev.filter((s) => s._id !== statusId));
      // Close viewer if the currently viewed status is deleted
      setActiveViewerGroup((current) => {
        if (current && current.statuses.some((s) => s._id === statusId)) {
          return null;
        }
        return current;
      });
      setSelectedStatusForViewers((current) => {
        if (current && current._id === statusId) {
          return null;
        }
        return current;
      });
    };

    const handleStatusViewed = (viewData) => {
      setAllStatuses((prev) =>
        prev.map((s) => {
          if (s._id === viewData.statusId) {
            return { ...s, viewers: viewData.viewers };
          }
          return s;
        })
      );
      setActiveViewerGroup((current) => {
        if (!current) return current;
        return {
          ...current,
          statuses: current.statuses.map((s) =>
            s._id === viewData.statusId ? { ...s, viewers: viewData.viewers } : s
          ),
        };
      });
      setSelectedStatusForViewers((current) => {
        if (current && current._id === viewData.statusId) {
          return { ...current, viewers: viewData.viewers };
        }
        return current;
      });
    };

    socket.on("new_status", handleNewStatus);
    socket.on("status_deleted", handleStatusDeleted);
    socket.on("status_viewed", handleStatusViewed);

    return () => {
      socket.off("new_status", handleNewStatus);
      socket.off("status_deleted", handleStatusDeleted);
      socket.off("status_viewed", handleStatusViewed);
    };
  }, []);

  // Separate & Group Statuses
  const myStatuses = allStatuses
    .filter((s) => s.user?._id === currentUser?._id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const otherStatusesGrouped = (() => {
    const grouped = {};
    allStatuses.forEach((status) => {
      if (status.user?._id === currentUser?._id || !status.user) return;
      const userId = status.user._id;
      if (!grouped[userId]) {
        grouped[userId] = {
          user: status.user,
          statuses: [],
        };
      }
      grouped[userId].statuses.push(status);
    });

    // Sort groups and statuses
    return Object.values(grouped).map((group) => {
      group.statuses.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return group;
    });
  })();

  // Handle Text Status Submit
  const handleTextStatusSubmit = async (e) => {
    e.preventDefault();
    if (!textContent.trim()) return;

    try {
      setLoading(true);
      // Format content as: COLOR|||TEXT
      const formattedContent = `${textBgColor}|||${textContent.trim()}`;
      const res = await createStatus({
        content: formattedContent,
        contentType: "text",
      });

      if (res.status === "success") {
        toast.success("Status posted successfully!");
        setAllStatuses((prev) => [res.data, ...prev]);
        setIsTextModalOpen(false);
        setTextContent("");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to post status");
    } finally {
      setLoading(false);
    }
  };

  // Handle Media File Selection
  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  // Handle Media Status Submit
  const handleMediaStatusSubmit = async (e) => {
    e.preventDefault();
    if (!mediaFile) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("media", mediaFile);
      formData.append("contentType", mediaFile.type.startsWith("video") ? "video" : "image");

      const res = await createStatus(formData);
      if (res.status === "success") {
        toast.success("Media status posted!");
        setAllStatuses((prev) => [res.data, ...prev]);
        setIsMediaModalOpen(false);
        setMediaFile(null);
        setMediaPreview(null);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to post media status");
    } finally {
      setLoading(false);
    }
  };

  // Delete Status Handler
  const handleDeleteStatus = async (statusId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this status?")) return;

    try {
      const res = await deleteStatus(statusId);
      if (res.status === "success") {
        toast.success("Status deleted");
        setAllStatuses((prev) => prev.filter((s) => s._id !== statusId));
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete status");
    }
  };

  // Start Status Viewer Auto-Play Timer
  useEffect(() => {
    if (!activeViewerGroup) return;

    setProgress(0);
    setRemainingSeconds(5);
    const activeStatus = activeViewerGroup.statuses[activeStatusIndex];

    if (activeStatus && activeStatus.user?._id !== currentUser?._id) {
      const alreadyViewed = activeStatus.viewers?.some((v) => {
        const vid = getViewerUserId(v);
        return vid === currentUser?._id;
      });
      if (!alreadyViewed) {
        viewStatus(activeStatus._id).catch((err) => console.error(err));
      }
    }

    const duration = 5000;
    const intervalTime = 50;
    const increment = (intervalTime / duration) * 100;

    progressInterval.current = setInterval(() => {
      if (isPausedRef.current || isViewerListOpenRef.current) return;
      setProgress((prev) => {
        const next = prev + increment;
        setRemainingSeconds(Math.max(0, Math.ceil(((100 - next) / 100) * 5)));
        if (next >= 100) {
          handleNextStatus();
          return 0;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(progressInterval.current);
  }, [activeViewerGroup, activeStatusIndex]);

  const handleNextStatus = () => {
    if (!activeViewerGroup) return;
    if (activeStatusIndex < activeViewerGroup.statuses.length - 1) {
      setActiveStatusIndex((prev) => prev + 1);
    } else {
      // End of this user's statuses
      setActiveViewerGroup(null);
    }
  };

  const handlePrevStatus = () => {
    if (!activeViewerGroup) return;
    if (activeStatusIndex > 0) {
      setActiveStatusIndex((prev) => prev - 1);
    }
  };

  // Parse Text Status contents (extracts background color if coded)
  const parseTextStatus = (content) => {
    if (content.includes("|||")) {
      const parts = content.split("|||");
      return { bgColor: parts[0], text: parts[1] };
    }
    return { bgColor: "#128c7e", text: content }; // default
  };

  const renderAvatarBorder = (statusCount, viewedCount) => {
    if (statusCount === 0) return null;

    const radius = 26;
    const circumference = 2 * Math.PI * radius;

    if (statusCount === 1) {
      const color = viewedCount === 1 ? "#9ca3af" : "#22c55e";
      return (
        <svg viewBox="0 0 60 60" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
          <circle
            cx="30" cy="30" r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="2.5"
          />
        </svg>
      );
    }

    // Segmented ring using svg
    const gap = 4;
    const segmentLength = (circumference - statusCount * gap) / statusCount;

    return (
      <svg viewBox="0 0 60 60" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
        <circle
          cx="30"
          cy="30"
          r={radius}
          fill="transparent"
          stroke={viewedCount === statusCount ? "#9ca3af" : "#22c55e"}
          strokeWidth="2.5"
          strokeDasharray={`${segmentLength} ${gap}`}
        />
      </svg>
    );
  };

  // Format viewedAt time
  const formatViewedAt = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Layout>
      <div
        className={`w-full h-full flex flex-col overflow-hidden ${theme === "dark"
            ? "bg-[rgb(17,27,33)] text-white border-gray-600"
            : "bg-white text-gray-800 border-gray-200"
          } border-r`}
      >
        {/* Header */}
        <div
          className={`p-4 flex items-center justify-between flex-shrink-0 ${theme === "dark" ? "bg-[#202c33]" : "bg-[#f0f2f5]"
            }`}
        >
          <h2 className="text-xl font-semibold">Status</h2>
          <div className="flex space-x-2">
            {/* Create Text Status Button */}
            <button
              onClick={() => setIsTextModalOpen(true)}
              className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-full transition-transform active:scale-95 shadow-md"
              title="Add text status"
            >
              <FaFont className="text-sm" />
            </button>
            {/* Create Media Status Button */}
            <button
              onClick={() => setIsMediaModalOpen(true)}
              className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-full transition-transform active:scale-95 shadow-md"
              title="Add media status"
            >
              <FaImage className="text-sm" />
            </button>
          </div>
        </div>

        {/* Scrollable Updates Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0">
          {/* My Status */}
          <div className="space-y-3">
            <h3
              className={`text-xs uppercase tracking-wider font-semibold ${theme === "dark" ? "text-green-400" : "text-green-600"
                }`}
            >
              My Updates
            </h3>

            {myStatuses.length > 0 ? (
              <div className="space-y-2">
                <div
                  onClick={() => {
                    setActiveViewerGroup({
                      user: currentUser,
                      statuses: myStatuses,
                    });
                    setActiveStatusIndex(0);
                  }}
                  className={`p-3 rounded-xl flex items-center justify-between cursor-pointer border transition-all ${theme === "dark"
                      ? "bg-[#202c33] border-gray-700 hover:bg-[#2a3942]"
                      : "bg-[#f8f9fa] border-gray-200 hover:bg-gray-100"
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
                      {currentUser?.profilePicture ? (
                        <img
                          src={currentUser.profilePicture}
                          alt="My Profile"
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <FaUserCircle className="w-12 h-12 text-gray-400" />
                      )}
                      {renderAvatarBorder(myStatuses.length, 0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm">My Status</h4>
                      <p className={`text-xs truncate ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        {myStatuses.length} updates active • click to view
                      </p>
                    </div>
                  </div>
                </div>

                {/* List of my status list items (for deletion) */}
                <div className="pl-4 space-y-1.5 border-l-2 border-green-500">
                  {myStatuses.map((status) => {
                    const isText = status.contentType === "text";
                    const { bgColor, text } = isText
                      ? parseTextStatus(status.content)
                      : { bgColor: "", text: "" };

                    const viewerCount = status.viewers?.length || 0;

                    return (
                      <div
                        key={status._id}
                        className={`p-2 rounded-lg flex items-center justify-between text-xs border ${theme === "dark"
                            ? "bg-[#182229] border-gray-800"
                            : "bg-gray-50 border-gray-150"
                          }`}
                      >
                        <div className="flex items-center space-x-2 truncate min-w-0 flex-1">
                          {isText ? (
                            <div
                              style={{ backgroundColor: bgColor }}
                              className="w-8 h-8 rounded-md flex items-center justify-center text-[8px] text-white p-1 text-center font-bold overflow-hidden flex-shrink-0"
                            >
                              {text.substring(0, 10)}...
                            </div>
                          ) : (
                            <img
                              src={status.content}
                              alt="Media Status"
                              className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                            />
                          )}
                          <div className="truncate min-w-0">
                            <p className="font-semibold capitalize text-green-500">
                              {status.contentType} Status
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {formatTimestamp(status.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 flex-shrink-0 ml-2">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForViewers(status);
                            }}
                            className={`flex items-center space-x-1 cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                              theme === "dark"
                                ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                                : "bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700"
                            }`}
                            title="Viewers list"
                          >
                            <FaEye />
                            <span>{viewerCount}</span>
                          </span>
                          <button
                            onClick={(e) => handleDeleteStatus(status._id, e)}
                            className="text-red-500 hover:text-red-700 hover:scale-110 transition-transform"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                className={`p-4 text-center rounded-xl border text-sm ${theme === "dark" ? "bg-[#202c33] border-gray-700 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-500"
                  }`}
              >
                No updates posted yet. Select an icon above to add a status.
              </div>
            )}
          </div>

          {/* Other Updates */}
          <div className="space-y-3">
            <h3
              className={`text-xs uppercase tracking-wider font-semibold ${theme === "dark" ? "text-green-400" : "text-green-600"
                }`}
            >
              Recent Updates
            </h3>

            {otherStatusesGrouped.length > 0 ? (
              <div className="space-y-2">
                {otherStatusesGrouped.map((group) => {
                  const latestStatus = group.statuses[group.statuses.length - 1];
                  const viewedCount = group.statuses.filter((s) =>
                    s.viewers?.some((v) => {
                      const vid = getViewerUserId(v);
                      return vid === currentUser?._id;
                    })
                  ).length;

                  return (
                    <div
                      key={group.user._id}
                      onClick={() => {
                        setActiveViewerGroup(group);
                        setActiveStatusIndex(0);
                      }}
                      className={`p-3 rounded-xl flex items-center justify-between cursor-pointer border transition-all ${theme === "dark"
                          ? "bg-[#202c33] border-gray-700 hover:bg-[#2a3942]"
                          : "bg-[#f8f9fa] border-gray-200 hover:bg-gray-100"
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
                          {group.user.profilePicture ? (
                            <img
                              src={group.user.profilePicture}
                              alt={group.user.username}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <FaUserCircle className="w-12 h-12 text-gray-400" />
                          )}
                          {renderAvatarBorder(group.statuses.length, viewedCount)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm">{group.user.username}</h4>
                          <p className={`text-xs truncate ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                            {group.statuses.length} updates • {formatTimestamp(latestStatus.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className={`p-8 text-center rounded-xl border text-sm ${theme === "dark" ? "bg-[#202c33] border-gray-700 text-gray-500" : "bg-gray-50 border-gray-200 text-gray-400"
                  }`}
              >
                No recent updates from others.
              </div>
            )}
          </div>
        </div>

        {/* --- Create Text Status Modal --- */}
        <AnimatePresence>
          {isTextModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{ backgroundColor: textBgColor }}
                className="w-full max-w-md h-[400px] rounded-2xl flex flex-col justify-between p-6 text-white shadow-2xl relative"
              >
                {/* Close button */}
                <button
                  onClick={() => setIsTextModalOpen(false)}
                  className="absolute top-4 right-4 p-2 bg-black bg-opacity-20 hover:bg-opacity-35 rounded-full transition-all text-white"
                >
                  <FaTimes />
                </button>

                {/* Color Selector */}
                <div className="flex justify-center space-x-2 pt-6">
                  {BG_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setTextBgColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-115 ${textBgColor === color ? "border-white scale-110" : "border-transparent"
                        }`}
                    />
                  ))}
                </div>

                {/* Textarea Input */}
                <div className="flex-1 flex items-center justify-center px-4">
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    maxLength={140}
                    placeholder="Type a status..."
                    className="w-full bg-transparent border-none outline-none text-center text-xl md:text-2xl font-bold placeholder-white placeholder-opacity-60 resize-none text-white leading-relaxed"
                    rows={4}
                    autoFocus
                  />
                </div>

                {/* Submit button */}
                <div className="flex justify-between items-center text-xs text-white text-opacity-80">
                  <span>{140 - textContent.length} characters left</span>
                  <button
                    onClick={handleTextStatusSubmit}
                    disabled={!textContent.trim() || loading}
                    className="px-6 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-lg transition-all active:scale-95 shadow"
                  >
                    {loading ? <Spinner /> : "Share Status"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- Create Media Status Modal --- */}
        <AnimatePresence>
          {isMediaModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`w-full max-w-md rounded-2xl p-6 shadow-2xl relative ${theme === "dark" ? "bg-[#202c33] text-white" : "bg-white text-gray-800"
                  }`}
              >
                {/* Close */}
                <button
                  onClick={() => {
                    setIsMediaModalOpen(false);
                    setMediaFile(null);
                    setMediaPreview(null);
                  }}
                  className={`absolute top-4 right-4 p-2 rounded-full transition-all ${theme === "dark" ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-600"
                    }`}
                >
                  <FaTimes />
                </button>

                <h3 className="text-lg font-bold mb-4">Post Media Status</h3>

                <form onSubmit={handleMediaStatusSubmit} className="space-y-4">
                  {mediaPreview ? (
                    <div className="relative w-full h-60 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                      {mediaFile?.type.startsWith("video") ? (
                        <video src={mediaPreview} controls className="max-h-full max-w-full" />
                      ) : (
                        <img src={mediaPreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMediaFile(null);
                          setMediaPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <div className={`border-2 border-dashed rounded-lg h-60 flex flex-col items-center justify-center p-4 ${theme === "dark" ? "border-gray-600" : "border-gray-300"}`}>
                      <FaImage className="text-4xl text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 mb-4 text-center">
                        Select an image or a video (max 24h expiration auto-managed)
                      </p>
                      <label className="cursor-pointer px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-sm">
                        Select File
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleMediaChange}
                          className="hidden"
                          required
                        />
                      </label>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!mediaFile || loading}
                    className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
                  >
                    {loading ? <Spinner /> : <span>Upload & Post</span>}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- Immersive Stories Viewer (Full Screen Overlay) --- */}
        <AnimatePresence>
          {activeViewerGroup && (
            <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-between select-none relative">

              {/* Progress Indicators */}
              <div className="absolute top-4 left-4 right-4 z-10 flex space-x-1">
                {activeViewerGroup.statuses.map((s, idx) => (
                  <div key={s._id} className="h-1 flex-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
                    <div
                      style={{
                        width:
                          idx < activeStatusIndex
                            ? "100%"
                            : idx === activeStatusIndex
                              ? `${progress}%`
                              : "0%",
                      }}
                      className="h-full bg-white transition-all duration-75 ease-linear"
                    />
                  </div>
                ))}
              </div>

              {/* Status Header */}
              <div className="absolute top-8 left-4 right-4 z-10 flex justify-between items-center text-white">
                <div className="flex items-center space-x-3">
                  {activeViewerGroup.user?.profilePicture ? (
                    <img
                      src={activeViewerGroup.user.profilePicture}
                      alt="User"
                      className="w-10 h-10 rounded-full object-cover border border-white"
                    />
                  ) : (
                    <FaUserCircle className="w-10 h-10 text-gray-300" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm">{activeViewerGroup.user?.username}</h4>
                    <p className="text-xs text-gray-300">
                      {formatTimestamp(activeViewerGroup.statuses[activeStatusIndex]?.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Countdown Timer */}
                  <div className="flex items-center space-x-1.5 bg-black bg-opacity-50 px-3 py-1.5 rounded-full">
                    <svg className="w-5 h-5" viewBox="0 0 36 36">
                      <circle
                        cx="18" cy="18" r="15.5"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="3"
                      />
                      <circle
                        cx="18" cy="18" r="15.5"
                        fill="none"
                        stroke="#00a884"
                        strokeWidth="3"
                        strokeDasharray={`${((100 - progress) / 100) * 97.39} 97.39`}
                        strokeLinecap="round"
                        transform="rotate(-90 18 18)"
                        className="transition-all duration-75 ease-linear"
                      />
                    </svg>
                    <span className="text-sm font-mono font-bold text-white min-w-[16px] text-center">
                      {remainingSeconds}
                    </span>
                  </div>

                  {isPaused && (
                    <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
                      Paused
                    </span>
                  )}

                  <button
                    onClick={() => setActiveViewerGroup(null)}
                    className="p-2 bg-black bg-opacity-40 hover:bg-opacity-65 rounded-full text-white text-lg transition-all"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              {/* Main Content Viewer */}
              <div
                onMouseDown={() => { setIsPaused(true); isPausedRef.current = true; }}
                onMouseUp={() => { setIsPaused(false); isPausedRef.current = false; }}
                onTouchStart={() => { setIsPaused(true); isPausedRef.current = true; }}
                onTouchEnd={() => { setIsPaused(false); isPausedRef.current = false; }}
                onMouseLeave={() => { setIsPaused(false); isPausedRef.current = false; }}
                className="flex-1 flex items-center justify-center relative w-full h-full"
              >

                {/* Navigation Hotspots */}
                <div
                  onClick={handlePrevStatus}
                  className="absolute left-0 top-0 bottom-0 w-1/4 z-10 cursor-pointer flex items-center justify-start p-4 text-white opacity-0 hover:opacity-40 transition-opacity"
                >
                  <FaChevronLeft className="text-3xl" />
                </div>
                <div
                  onClick={handleNextStatus}
                  className="absolute right-0 top-0 bottom-0 w-1/4 z-10 cursor-pointer flex items-center justify-end p-4 text-white opacity-0 hover:opacity-40 transition-opacity"
                >
                  <FaChevronRight className="text-3xl" />
                </div>

                {/* Display active status contents */}
                {(() => {
                  const status = activeViewerGroup.statuses[activeStatusIndex];
                  if (!status) return null;

                  if (status.contentType === "text") {
                    const { bgColor, text } = parseTextStatus(status.content);
                    return (
                      <div
                        style={{ backgroundColor: bgColor }}
                        className="w-full h-full flex items-center justify-center text-center p-8 text-white text-2xl md:text-3xl font-extrabold select-text leading-relaxed break-words max-w-full"
                      >
                        {text}
                      </div>
                    );
                  }

                  if (status.contentType === "video") {
                    return (
                      <video
                        src={status.content}
                        autoPlay
                        className="max-h-screen max-w-full object-contain"
                      />
                    );
                  }

                  return (
                    <img
                      src={status.content}
                      alt="Status update"
                      className="max-h-screen max-w-full object-contain"
                    />
                  );
                })()}
              </div>

              {activeViewerGroup.user && String(activeViewerGroup.user._id || activeViewerGroup.user) === String(currentUser?._id) && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsViewerListOpen(true);
                  }}
                  className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-40 flex flex-col items-center justify-center text-white bg-[#202c33] px-5 py-2.5 rounded-full text-xs cursor-pointer hover:bg-[#2a3942] transition-all select-none border border-green-500 shadow-lg"
                >
                  <div className="flex items-center space-x-1">
                    <FaEye className="text-green-500 text-sm" />
                    <span>
                      Viewed by {activeViewerGroup.statuses[activeStatusIndex]?.viewers?.length || 0} users
                    </span>
                  </div>
                  {(activeViewerGroup.statuses[activeStatusIndex]?.viewers?.length || 0) > 0 && (
                    <p className="text-[10px] text-gray-400 mt-1 max-w-[200px] truncate text-center">
                      Tap to view list
                    </p>
                  )}
                </div>
              )}

              {/* Detailed Viewers List Bottom Drawer */}
              <AnimatePresence>
                {isViewerListOpen && activeViewerGroup.user && String(activeViewerGroup.user._id || activeViewerGroup.user) === String(currentUser?._id) && (
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-0 left-0 right-0 z-50 bg-[#1f2c34] text-white rounded-t-2xl max-h-[60vh] flex flex-col shadow-2xl"
                  >
                    {/* Drawer Handle / Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
                      <div className="flex items-center space-x-2">
                        <FaEye className="text-green-500 text-lg" />
                        <h3 className="font-bold text-base">
                          Viewed by ({activeViewerGroup.statuses[activeStatusIndex]?.viewers?.length || 0})
                        </h3>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsViewerListOpen(false);
                        }}
                        className="p-1 hover:bg-gray-700 rounded-full transition-colors"
                      >
                        <FaTimes className="text-gray-400" />
                      </button>
                    </div>

                    {/* Viewers Scrollable List */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                      {(activeViewerGroup.statuses[activeStatusIndex]?.viewers?.length || 0) === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-8">No views yet</p>
                      ) : (
                        activeViewerGroup.statuses[activeStatusIndex].viewers.map((viewer, idx) => {
                          // Handle both old schema (plain user object) and new schema ({user, viewedAt})
                          const viewerUser = viewer?.user || viewer;
                          const viewedAt = viewer?.viewedAt;

                          return (
                            <div key={viewerUser?._id || idx} className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                                {viewerUser?.profilePicture ? (
                                  <img
                                    src={viewerUser.profilePicture}
                                    alt={viewerUser.username}
                                    className="w-10 h-10 rounded-full object-cover border border-gray-700 flex-shrink-0"
                                  />
                                ) : (
                                  <FaUserCircle className="w-10 h-10 text-gray-500 flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm truncate">{viewerUser?.username || "Unknown"}</p>
                                  {viewedAt ? (
                                    <p className="text-[10px] text-gray-400">
                                      Viewed at {formatViewedAt(viewedAt)}
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-gray-400">
                                      {viewerUser?.about || "Hey there! I am using WhatsApp."}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span
                                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${viewerUser?.isOnline ? "bg-green-500" : "bg-gray-500"
                                  }`}
                                title={viewerUser?.isOnline ? "Online" : "Offline"}
                              />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              </div>
            )}
          </AnimatePresence>

          {/* --- Viewers List Modal for Specific Status --- */}
          <AnimatePresence>
            {selectedStatusForViewers && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className={`w-full max-w-md rounded-2xl flex flex-col shadow-2xl relative max-h-[80vh] ${
                    theme === "dark" ? "bg-[#202c33] text-white" : "bg-white text-gray-800"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
                    <div className="flex items-center space-x-2">
                      <FaEye className="text-green-500 text-lg" />
                      <h3 className="font-bold text-base">
                        Status Viewers ({selectedStatusForViewers.viewers?.length || 0})
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedStatusForViewers(null)}
                      className="p-1.5 hover:bg-gray-700 rounded-full transition-colors text-gray-400"
                    >
                      <FaTimes />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {(!selectedStatusForViewers.viewers || selectedStatusForViewers.viewers.length === 0) ? (
                      <p className="text-gray-400 text-sm text-center py-8">No views yet</p>
                    ) : (
                      selectedStatusForViewers.viewers.map((viewer, idx) => {
                        const viewerUser = viewer?.user || viewer;
                        const viewedAt = viewer?.viewedAt;

                        return (
                          <div key={viewerUser?._id || idx} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              {viewerUser?.profilePicture ? (
                                <img
                                  src={viewerUser.profilePicture}
                                  alt={viewerUser.username}
                                  className="w-10 h-10 rounded-full object-cover border border-gray-700 flex-shrink-0"
                                />
                              ) : (
                                <FaUserCircle className="w-10 h-10 text-gray-500 flex-shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{viewerUser?.username || "Unknown"}</p>
                                {viewedAt ? (
                                  <p className="text-[10px] text-gray-400">
                                    Viewed at {formatViewedAt(viewedAt)}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-gray-400">
                                    {viewerUser?.about || "Hey there! I am using WhatsApp."}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${viewerUser?.isOnline ? "bg-green-500" : "bg-gray-500"
                                }`}
                              title={viewerUser?.isOnline ? "Online" : "Offline"}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      </Layout>
  );
};

export default Status;