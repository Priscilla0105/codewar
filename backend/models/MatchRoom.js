// backend/models/MatchRoom.js
const mongoose = require('mongoose');

const MatchRoomSchema = new mongoose.Schema({
  roomCode: { type: String, unique: true },
  creatorId: String,
  creatorName: String,
  difficulty: String,
  players: [{
    userId: String,
    username: String,
    socketId: String
  }],
  status: { type: String, default: 'waiting' },
  problem: { id: String, title: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MatchRoom', MatchRoomSchema);