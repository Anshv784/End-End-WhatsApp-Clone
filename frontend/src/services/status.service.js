import { axiosInstance } from "./url.service";

// Create Status
export const createStatus = async (formData) => {
  try {
    const response = await axiosInstance.post("/status", formData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// Get All Statuses
export const getAllStatuses = async () => {
  try {
    const response = await axiosInstance.get("/status");
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// View Status (mark as viewed)
export const viewStatus = async (statusId) => {
  try {
    const response = await axiosInstance.put(`/status/${statusId}/view`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// Delete Status
export const deleteStatus = async (statusId) => {
  try {
    const response = await axiosInstance.delete(`/status/${statusId}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};
