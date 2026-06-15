import multer from "multer"

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Images
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg",
    // Videos
    "video/mp4", "video/mpeg", "video/ogg", "video/webm", "video/quicktime",
    // Audio
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm",
    // Documents
    "application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images, videos, audio, and standard documents are allowed."), false);
  }
};

const uploadDir = process.env.VERCEL ? "/tmp" : "uploads/";

export const multerMiddleware = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter
}).single("media");