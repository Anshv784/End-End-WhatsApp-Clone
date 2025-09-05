import User from "../models/user.model.js";
import response from "../utils/responseHandler.js";
import { genOtp } from "../utils/genOtp.js";
import { sendOtpToEmail } from "../services/emailService.js";
import { sendOtpToPhoneNumber, verifyOtp as verifyPhoneOtp } from "../services/twillioService.js";
import { generateToken } from "../utils/generateToken.js";
import { uploadFileToCloudinary } from "../lib/cloudinaryConfig.js";

export const sendOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email } = req.body;
  const otp = genOtp();
  const expiry = new Date(Date.now() + 5 * 60 * 1000);
  let user;

  try {
    // --- OTP by Email ---
    if (email) {
      user = await User.findOne({ email });
      if (!user) user = new User({ email });

      user.emailOtp = otp;
      user.emailOtpExpiry = expiry;
      await user.save();

      await sendOtpToEmail(email, otp);
      return response(res, 200, "OTP sent to your email", { email });
    }

    // --- OTP by Phone ---
    if (!phoneNumber || !phoneSuffix) {
      return response(res, 400, "Phone number or suffix missing");
    }

    const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
    user = await User.findOne({ phoneNumber });
    if (!user) user = new User({ phoneNumber });

    await sendOtpToPhoneNumber(fullPhoneNumber); // handled by Twilio Service 
    await user.save();

    return response(res, 200, "OTP sent to your phone", { phoneNumber });
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error", { error: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email, otp } = req.body;
  console.log(req.body)
  let user;

  try {
    if (email) {
      user = await User.findOne({email});
      console.log({email})
      if (!user) return response(res, 404, "User not found");

      const now = new Date();
      if (!user.emailOtp || String(user.emailOtp) !== String(otp) || now > new Date(user.emailOtpExpiry)) {
        return response(res, 400, "invalid or expired otp");
      }

      user.isVerified = true;
      user.emailOtp = null;
      user.emailOtpExpiry = null;
      await user.save();
    } 
    else {
      if (!phoneNumber || !phoneSuffix) {
        return response(res, 400, "Phone number and phone suffix are required");
      }
      const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
      user = await User.findOne({ phoneNumber});
      if (!user) return response(res, 404, "User not found");

      const result = await verifyPhoneOtp(fullPhoneNumber, otp);
      if (result.status !== "approved") {
        return response(res, 400, "Invalid Otp");
      }

      user.isVerified = true;
      await user.save();
    }

    const token = generateToken(user?._id);
    res.cookie("auth_token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365,
      secure: true,
      sameSite: "strict",
    });

    console.log("Otp verified")
    return response(res, 200, "otp verified successfully", { token, user });
  } catch (error) {
    console.error(error);
    return response(res, 500, "internal server error", { error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  const { username, agreed, about } = req.body;
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    const file = req.file;

    if (file) {
      const uploadResult = await uploadFileToCloudinary(file);
      user.profilePicture = uploadResult?.secure_url;
    } else if (req.body.profilePicture) {
      user.profilePicture = req.body.profilePicture;
    }

    if (username) user.username = username;
    if (agreed) user.agreed = agreed;
    if (about) user.about = about;

    console.log(user);

    await user.save();

    return response(res, 200, "user profile updated successfully", user);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

export const getAllUsers = async (req, res) => {
  const loggedInUser = req.user.userId;
  try {
    const users = await User.find({ _id: { $ne: loggedInUser } })
      .select("username profilePicture lastSeen isOnline about phoneNumber phoneSuffix")
      .lean();

    const usersWithConversation = await Promise.all(
      users.map(async (user) => {
        const conversation = await Conversation.findOne({
          participants: { $all: [loggedInUser, user?._id] }
        })
          .populate({
            path: "lastMessage",
            select: "content createdAt sender receiver"
          })
          .lean();

        return {
          ...user,
          conversation: conversation || null
        };
      })
    );

    return response(res, 200, "users retived successfully", usersWithConversation);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

