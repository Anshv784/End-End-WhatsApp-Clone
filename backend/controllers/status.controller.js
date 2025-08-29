import Message from "../models/messages.model.js";
import Status from "../models/status.model.js";
import response from "../utils/responseHandler.js";
import {uploadFileToCloudinary} from "../lib/cloudinaryConfig.js";

// Create Status
export const createStatus = async (req, res) => {
  try {
    const { content, contentType } = req.body;
    const userId = req.user.userId;
    const file = req.file;

    let mediaUrl = null;
    let finalContentType = contentType || 'text';

    // handle file upload
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);

      if (!uploadFile?.secure_url) {
        return response(res, 400, "Failed to upload media");
      }

      mediaUrl = uploadFile?.secure_url;

      if (file.mimetype.startsWith("image")) {
        finalContentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        finalContentType = "video";
      } else {
        return response(res, 400, "Unsupported file type");
      }
    }

    if (!content && !mediaUrl) {
      return response(res, 400, "Message content is requierd");
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const status = new Status({
      user: userId,
      content: mediaUrl || content,
      contentType: finalContentType,
      imageOrVideoUrl,
      messageStatus,
      expiresAt,
    });

    await status.save();

    const populatedStatus = await Message.findOne(status?._id)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");

    return response(res, 201, "Status created Successfully", populatedStatus);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

// Get All Statuses
export const getStatus = async (req, res) => {
  try {
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture")
      .sort({ createdAt: -1 });

    return response(res, 200, "statuses retrived successfully", statuses);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

// View Status
export const viewStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;

  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }

    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId);
      await status.save();

    const updateStatus = await Status.findById(statusId)
        .populate("user", "username profilePicture")
        .populate("viewers", "username profilePicture");
    } else {
      console.log("user already viewed the status");
    }

    return response(res, 200, "status viewed successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

// Delete Status
export const deleteStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;

  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }

    if (status.user.toString() !== userId) {
      return response(res, 403, "Not authorized to delete this status");
    }

    await status.deleteOne();
    return response(res, 200, "status deleted successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};
