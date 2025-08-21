import multer from "multer"

export const multerMiddleware = multer({ dest: "uploads/" }).single("media");