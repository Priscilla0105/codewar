import mongoose, { Schema } from "mongoose";

const MatchSchema = new Schema({
  id: String,
  player1Id: String,
  player2Id: String,
  player1Name: String,
  player2Name: String,
  difficulty: String,
  problemId: String,
  winner: String,
  eloChange1: Number,
  eloChange2: Number,
  date: { type: Date, default: Date.now }
});

export const MatchModel = mongoose.models.Match || mongoose.model("Match", MatchSchema);