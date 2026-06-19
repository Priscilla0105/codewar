// backend/server.js

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());

app.use(
  cors({
    origin: [
      "https://codewar-gold.vercel.app"
    ],
    credentials: true
  })
);

// MongoDB Connection
mongoose
  .connect(
    process.env.MONGODB_URI ||
      "mongodb://localhost:27017/clash-arena"
  )
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err);
  });

// Routes
const customRoomsRouter = require("./routes/customRooms");
app.use("/api/custom-rooms", customRoomsRouter);

const matchRoutes = require("./routes/matchRoutes");
app.use("/api/match", matchRoutes);

// Health Check
app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Clash Arena Backend Running 🚀"
  });
});

// Socket.IO
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("user-join", (userData) => {
    console.log("📍 User joined:", userData.username);
  });

  socket.on("start-matchmaking", (data) => {
    console.log("🔍 Matchmaking started:", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected");
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});