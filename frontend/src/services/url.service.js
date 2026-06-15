import axios from "axios"

const getApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && window.location.hostname !== "localhost" && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
        return "";
    }
    return envUrl || "";
};

const apiUrl = `${getApiUrl()}/api`;

export const axiosInstance = axios.create({
    baseURL : apiUrl,
    withCredentials : true
})