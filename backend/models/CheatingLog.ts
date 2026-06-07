import mongoose, { Schema } from "mongoose";

const CheatingLogSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    username: { type: String, required: true },
    matchId: { type: String, index: true },
    type: { 
      type: String, 
      enum: ["tab-switch", "paste-detect", "devtools", "fullscreen-exit", "idle"],
      required: true 
    },
    details: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    warningsCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const CheatingLogModel: mongoose.Model<any> = mongoose.models.CheatingLog || mongoose.model("CheatingLog", CheatingLogSchema);
