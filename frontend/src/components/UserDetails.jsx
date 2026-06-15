import React, { useState, useEffect } from "react";
import Layout from "./Layout";
import useUserStore from "../store/userStore";
import useThemeStore from "../store/themeStore";
import { updateUserProfile } from "../services/user.service";
import { avatars } from "../utils/avatars";
import { toast } from "react-toastify";
import { FaArrowLeft, FaCamera, FaUser, FaInfoCircle, FaSave } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Spinner from "./Spinner";
import { motion } from "framer-motion";

const UserDetails = () => {
  const { user, setUser } = useUserStore();
  const { theme } = useThemeStore();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [about, setAbout] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load user info
  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setAbout(user.about || "Hey there! I am using WhatsApp.");
      setProfilePicture(user.profilePicture || "");
      // If user profile picture is one of the predefined avatars, select it
      if (avatars.includes(user.profilePicture)) {
        setSelectedAvatar(user.profilePicture);
      }
    }
  }, [user]);

  const onHandleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      setProfilePicture(URL.createObjectURL(file));
      setSelectedAvatar(""); // Deselect predefined avatar if custom upload chosen
    }
  };

  const handleAvatarSelect = (avatarUrl) => {
    setSelectedAvatar(avatarUrl);
    setProfilePicture(avatarUrl);
    setProfilePictureFile(null); // Clear custom upload if avatar selected
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("username", username.trim());
      formData.append("about", about.trim());
      formData.append("agreed", "true"); // default to true since they are already logged in

      if (profilePictureFile) {
        formData.append("media", profilePictureFile);
      } else if (selectedAvatar) {
        formData.append("profilePicture", selectedAvatar);
      } else {
        // Keep current profile picture URL
        formData.append("profilePicture", profilePicture);
      }

      const response = await updateUserProfile(formData);
      if (response.status === "success") {
        toast.success("Profile updated successfully");
        setUser(response.data);
      } else {
        toast.error(response.message || "Failed to update profile");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className={`w-full h-full flex flex-col ${
          theme === "dark"
            ? "bg-[rgb(17,27,33)] text-white border-gray-600"
            : "bg-white text-gray-800 border-gray-200"
        } border-r`}
      >
        {/* Header */}
        <div
          className={`p-4 flex items-center space-x-4 ${
            theme === "dark" ? "bg-[#202c33]" : "bg-[#f0f2f5]"
          }`}
        >
          <button
            onClick={() => navigate("/")}
            className={`p-2 rounded-full hover:bg-opacity-10 hover:bg-gray-500 transition-colors ${
              theme === "dark" ? "text-white" : "text-gray-800"
            }`}
          >
            <FaArrowLeft className="text-lg" />
          </button>
          <h2 className="text-xl font-semibold">Profile</h2>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-20">
          {/* Profile Photo Display */}
          <div className="flex flex-col items-center">
            <div className="relative w-36 h-36 mb-4 group cursor-pointer">
              <img
                src={profilePicture || "https://api.dicebear.com/6.x/avataaars/svg?seed=Felix"}
                alt="Profile"
                className="w-full h-full rounded-full object-cover border-4 border-green-500 shadow-md"
              />
              <label
                htmlFor="profile-upload"
                className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer text-white text-xs font-semibold"
              >
                <FaCamera className="text-2xl mb-1" />
                <span>CHANGE PHOTO</span>
              </label>
              <input
                type="file"
                id="profile-upload"
                accept="image/*"
                onChange={onHandleFileChange}
                className="hidden"
              />
            </div>

            {/* Predefined Avatars */}
            <div className="w-full text-center">
              <p
                className={`text-xs ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                } mb-2 uppercase tracking-wider font-semibold`}
              >
                Or Select an Avatar
              </p>
              <div className="flex justify-center gap-2 flex-wrap">
                {avatars.map((avatar, index) => (
                  <img
                    key={index}
                    src={avatar}
                    alt={`Avatar ${index + 1}`}
                    className={`w-10 h-10 rounded-full cursor-pointer transition-all duration-200 transform hover:scale-110 ${
                      selectedAvatar === avatar
                        ? "ring-2 ring-green-500 scale-105"
                        : "opacity-75 hover:opacity-100"
                    }`}
                    onClick={() => handleAvatarSelect(avatar)}
                  />
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <label
                className={`text-sm ${
                  theme === "dark" ? "text-green-400" : "text-green-600"
                } font-semibold flex items-center space-x-2`}
              >
                <FaUser />
                <span>Your Name</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={25}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${
                  theme === "dark"
                    ? "bg-gray-800 text-white border-gray-700 placeholder-gray-500"
                    : "bg-gray-50 text-black border-gray-200 placeholder-gray-400"
                }`}
                placeholder="Enter your username"
                required
              />
              <p
                className={`text-xs ${
                  theme === "dark" ? "text-gray-500" : "text-gray-400"
                } text-right`}
              >
                {25 - username.length} characters remaining
              </p>
            </div>

            {/* About Field */}
            <div className="space-y-2">
              <label
                className={`text-sm ${
                  theme === "dark" ? "text-green-400" : "text-green-600"
                } font-semibold flex items-center space-x-2`}
              >
                <FaInfoCircle />
                <span>About</span>
              </label>
              <input
                type="text"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                maxLength={100}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${
                  theme === "dark"
                    ? "bg-gray-800 text-white border-gray-700 placeholder-gray-500"
                    : "bg-gray-50 text-black border-gray-200 placeholder-gray-400"
                }`}
                placeholder="About you status"
              />
              <p
                className={`text-xs ${
                  theme === "dark" ? "text-gray-500" : "text-gray-400"
                } text-right`}
              >
                {100 - about.length} characters remaining
              </p>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Spinner />
              ) : (
                <>
                  <FaSave />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </Layout>
  );
};

export default UserDetails;