import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({
  matchId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  type: {
    type: String,
    enum: ["ranked", "practice", "quiz", "custom"],
    required: true,
  },
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    required: true,
  },
  player1: {
    userId: String,
    username: String,
    avatar: String,
  },
  player2: {
    userId: String,
    username: String,
    avatar: String,
  },
  problemId: String,
  problemTitle: String,
  roomCode: String,
  status: {
    type: String,
    enum: ["waiting", "active", "completed", "cancelled"],
    default: "waiting",
  },
  winner: String,
  player1Result: {
    userId: String,
    code: String,
    language: String,
    problemId: String,
    executionTime: Number,
    submittedAt: Date,
    status: String,
  },
  player2Result: {
    userId: String,
    code: String,
    language: String,
    problemId: String,
    executionTime: Number,
    submittedAt: Date,
    status: String,
  },
  eloChanges: {
    player1: { type: Number, default: 0 },
    player2: { type: Number, default: 0 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  startedAt: Date,
  completedAt: Date,
});

const Match = mongoose.model("Match", matchSchema);

export default Match;