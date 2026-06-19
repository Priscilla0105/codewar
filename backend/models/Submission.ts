import mongoose, { Schema } from "mongoose";

const SubmissionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    username: { type: String, required: true },
    problemId: { type: String, required: true, index: true },
    problemTitle: { type: String, required: true },
    language: { type: String, required: true },
    code: { type: String, required: true },
    status: { 
      type: String, 
      enum: ["Accepted", "Wrong Answer", "Runtime Error", "Compilation Error", "Time Limit Exceeded"],
      required: true 
    },
    executionTimeMs: { type: Number, default: 0 },
    memoryUsageKb: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now },
    failedTestCaseIndex: { type: Number },
    actualOutput: { type: String },
    expectedOutput: { type: String }
  },
  { timestamps: true }
);

export const SubmissionModel: mongoose.Model<any> = mongoose.models.Submission || mongoose.model("Submission", SubmissionSchema);
