# 📱 WhatsApp Clone  

A full-stack **WhatsApp Clone** with real-time chat, statuses, video calls, media sharing (text, images, videos), and emoji reactions. Built with **Node.js, Express, MongoDB, Socket.io, React, and WebRTC**.  

---

## ✨ Features  

- 🔐 Authentication & Authorization (JWT-based)  
- 💬 Real-time 1:1 & group chats using **Socket.IO**  
- 📷 Send **text, images, or videos** in conversations  
- 😀 Emoji reactions to messages  
- 📡 Online/last seen status tracking  
- 🟢 Status (Stories) similar to WhatsApp  
- 📞 Video & Audio calls (WebRTC)  
- 📨 Read receipts & delivery ticks  
- 🔔 Unread message count per conversation  
- 🐳 Docker support for containerized deployment  

---

## 🛠️ Tech Stack  

**Frontend**  
- React + Vite  
- Tailwind CSS + Material UI  
- Socket.IO client  
- WebRTC  

**Backend**  
- Node.js + Express  
- MongoDB + Mongoose  
- JWT for authentication  
- Socket.IO  
- Multer + Cloudinary for file uploads  

**DevOps**  
- Docker & Docker Compose  

---

## 📂 Project Structure  

```bash
.
├── backend/         # Express + Socket.IO + MongoDB
│   ├── src/
│   ├── Dockerfile
│   └── package.json
│
├── frontend/        # React + Vite + Tailwind
│   ├── src/
│   ├── Dockerfile
│   └── package.json
│
└── docker-compose.yml
