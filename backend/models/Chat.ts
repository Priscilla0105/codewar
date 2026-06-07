import mongoose, { Schema } from "mongoose";

const ChatSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    sender: { type: String, required: true, index: true }, // custom user string id (e.g. u_xxx)
    senderName: { type: String, required: true },
    receiver: { type: String, default: "" }, // user id or empty for lobby broadcasts
    roomId: { type: String, required: true, index: true }, // maps to socket lobbyId
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    isAi: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const ChatModel: mongoose.Model<any> = mongoose.models.Chat || mongoose.model("Chat", ChatSchema);
