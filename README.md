# 📱 WhatsApp Clone (Full-Stack)

A full-stack, responsive WhatsApp Clone featuring real-time messaging, status stories, media sharing, emoji reactions, and real-time online/typing indicators. Built using Node.js, Express, MongoDB, Socket.io, React, and Tailwind CSS.

---

## ✨ Features

- **Authentication**: Email/Phone-based OTP verification with secure JWT session cookies.
- **Real-Time Chat**: Real-time communication powered by Socket.io, with message delivery and read receipts.
- **Media Sharing**: Support for sharing text, images, and videos in chats and status updates (powered by Cloudinary and Multer).
- **Status (Stories)**: Share temporary updates (images, videos, or text) that expire automatically after 24 hours.
- **Indicators**: Live online/last-seen status and active typing indicators.
- **Emoji Reactions**: React to any message with modern emojis.
- **Clean Responsive UI**: Modern design with seamless dark mode support.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Zustand (State Management), Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.io, JWT, Multer, Cloudinary
- **OTP Delivery**: Nodemailer (Email) & Twilio Verify API (SMS)

---

## 📁 Project Structure

```text
End-End-WhatsApp-Clone/
├── backend/                  # Express API Server
│   ├── controllers/          # Request handlers (auth, chat, status)
│   ├── lib/                  # Library configs (db, Cloudinary)
│   ├── middlewares/          # Auth guards and Multer configuration
│   ├── models/               # Mongoose schemas (User, Conversation, Message, Status)
│   ├── routes/               # API endpoint definitions
│   ├── services/             # Core logic (Socket.io, Twilio, Email)
│   ├── utils/                # General helpers and response formatters
│   └── src/server.js         # Backend entry point
│
└── frontend/                 # React SPA
    ├── src/
    │   ├── components/       # Layouts, Sidebar, Loaders
    │   ├── pages/            # Login, Chat, Status, Settings views
    │   ├── services/         # API clients (axios wrappers)
    │   ├── store/            # Zustand state stores
    │   └── utils/            # General frontend utilities
    └── .env                  # Frontend configuration
```

---

## ⚙️ Prerequisites

- **Node.js**: `v18.x` or higher
- **MongoDB**: A running local instance or a MongoDB Atlas URI
- **Cloudinary Account**: For handling media uploads
- **Twilio Account**: (Optional) For SMS OTP verification
- **Gmail Account**: (Optional) For Email-based OTP verification

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/End-End-WhatsApp-Clone.git
cd End-End-WhatsApp-Clone
```

### 2. Configure Backend
Navigate to the `backend/` directory, create a `.env` file, and populate the following values:

```bash
cd backend
touch .env
```

```env
PORT=8080
MONGO_URI=mongodb://127.0.0.1:27017/whatsapp-clone
JWT_SECRET=your_super_secret_jwt_key
ACCESS_POINT=http://localhost:3000

# Cloudinary Config (for media uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Twilio Config (for SMS OTP)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_SERVICE_SID=your_twilio_service_sid

# Gmail SMTP Config (for Email OTP)
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_app_password
```

Install backend dependencies and start the development server:
```bash
npm install
npm run dev
```

### 3. Configure Frontend
Navigate to the `frontend/` directory, create a `.env` file, and set the API URL:

```bash
cd ../frontend
touch .env
```

```env
VITE_API_URL=http://localhost:8080
```

Install frontend dependencies and start the Vite dev server:
```bash
npm install
npm run dev
```

The app will now be running at `http://localhost:3000`.

---

## 🔒 Security & Hardening Features

1. **CORS Validation**: Whitelists frontend origins correctly through array checking.
2. **Payload Size Restrictions**: Limits incoming JSON request sizes to prevent denial of service.
3. **Cookie Configuration**: Sets `httpOnly` secure cookies with cross-site `sameSite: "none"` setup.
4. **File Type Filtering**: Multer only permits whitelisted image, video, audio, and standard document types.
5. **Secure Logs**: Avoids leaking user credentials or active OTP codes inside backend process logs.