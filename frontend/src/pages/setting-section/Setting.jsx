import React, { useState } from "react";
import Layout from "../../components/Layout";
import useUserStore from "../../store/userStore";
import useThemeStore from "../../store/themeStore";
import { logoutUser } from "../../services/user.service";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaSun,
  FaMoon,
  FaSignOutAlt,
  FaInfoCircle,
  FaUserEdit,
  FaChevronRight,
} from "react-icons/fa";
import { motion } from "framer-motion";
import Spinner from "../../components/Spinner";

const Setting = () => {
  const { user, clearUser } = useUserStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      const response = await logoutUser();
      if (response.status === "success" || response.message) {
        toast.success("Logged out successfully");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.warn("Logged out from device locally");
    } finally {
      clearUser();
      setLoading(false);
      navigate("/user-login");
    }
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className={`w-full h-full flex flex-col ${theme === "dark"
            ? "bg-[rgb(17,27,33)] text-white border-gray-600"
            : "bg-white text-gray-800 border-gray-200"
          } border-r`}
      >
        {/* Header */}
        <div
          className={`p-4 flex items-center space-x-4 ${theme === "dark" ? "bg-[#202c33]" : "bg-[#f0f2f5]"
            }`}
        >
          <button
            onClick={() => navigate("/")}
            className={`p-2 rounded-full hover:bg-opacity-10 hover:bg-gray-500 transition-colors ${theme === "dark" ? "text-white" : "text-gray-800"
              }`}
          >
            <FaArrowLeft className="text-lg" />
          </button>
          <h2 className="text-xl font-semibold">Settings</h2>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* Profile Card */}
          {user && (
            <div
              onClick={() => navigate("/user-profile")}
              className={`p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 border shadow-sm ${theme === "dark"
                  ? "bg-[#202c33] border-gray-700 hover:bg-[#2a3942]"
                  : "bg-[#f8f9fa] border-gray-200 hover:bg-gray-100"
                }`}
            >
              <div className="flex items-center space-x-4">
                <img
                  src={user.profilePicture || "https://api.dicebear.com/6.x/avataaars/svg?seed=Felix"}
                  alt={user.username}
                  className="w-14 h-14 rounded-full object-cover border-2 border-green-500"
                />
                <div>
                  <h3 className="font-semibold text-lg">{user.username}</h3>
                  <p
                    className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"
                      } truncate max-w-[200px]`}
                  >
                    {user.about || "Hey there! I am using WhatsApp."}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <FaUserEdit className="text-green-500 hover:scale-110 transition-transform" />
                <FaChevronRight className="text-gray-400 text-xs" />
              </div>
            </div>
          )}

          {/* Theme Settings section */}
          <div className="space-y-3">
            <h4
              className={`text-xs uppercase tracking-wider font-semibold ${theme === "dark" ? "text-green-400" : "text-green-600"
                }`}
            >
              Theme Preferences
            </h4>
            <div
              className={`border rounded-xl p-4 flex items-center justify-between ${theme === "dark" ? "bg-[#202c33] border-gray-700" : "bg-[#f8f9fa] border-gray-200"
                }`}
            >
              <div className="flex items-center space-x-3">
                {theme === "dark" ? (
                  <FaMoon className="text-indigo-400 text-xl animate-pulse" />
                ) : (
                  <FaSun className="text-yellow-500 text-xl" />
                )}
                <div>
                  <span className="font-medium">Dark Mode</span>
                  <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                    Toggle to adjust screen brightness
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${theme === "dark" ? "bg-green-500" : "bg-gray-300"
                  }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${theme === "dark" ? "translate-x-6" : ""
                    }`}
                />
              </button>
            </div>
          </div>

          {/* App Info section */}
          <div className="space-y-3">
            <h4
              className={`text-xs uppercase tracking-wider font-semibold ${theme === "dark" ? "text-green-400" : "text-green-600"
                }`}
            >
              App Info
            </h4>
            <div
              className={`border rounded-xl p-4 space-y-3 ${theme === "dark" ? "bg-[#202c33] border-gray-700" : "bg-[#f8f9fa] border-gray-200"
                }`}
            >
              <div className="flex items-start space-x-3">
                <FaInfoCircle className="text-blue-500 text-lg mt-0.5" />
                <div>
                  <h5 className="font-semibold text-sm">WhatsApp Clone</h5>
                  <p className="text-xs text-gray-500">Version 1.0.0 (Production-Ready)</p>
                  <p className="text-xs text-gray-400 mt-2">
                    A fully-featured real-time chatting, multimedia share, stories updating messaging
                    platform built with React, Node.js, Socket.io, and Cloudinary.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Danger zone / Logout */}
          <div className="pt-4 border-t border-gray-300 dark:border-gray-700">
            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-lg shadow transition-all disabled:opacity-50"
            >
              {loading ? (
                <Spinner />
              ) : (
                <>
                  <FaSignOutAlt />
                  <span>Log Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
};

export default Setting;