import mongoose, { Schema } from "mongoose";

const TestCaseSchema = new Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true }
}, { _id: false });

const StarterCodeSchema = new Schema({
  c: { type: String, default: "" },
  cpp: { type: String, default: "" },
  java: { type: String, default: "" },
  python: { type: String, default: "" },
  javascript: { type: String, default: "" }
}, { _id: false });

const ProblemSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, index: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true, index: true },
    tags: { type: [String], default: [] },
    constraints: { type: [String], default: [] },
    inputFormat: { type: String, default: "" },
    outputFormat: { type: String, default: "" },
    visibleTestCases: { type: [TestCaseSchema], default: [] },
    hiddenTestCases: { type: [TestCaseSchema], default: [] },
    starterCode: { type: StarterCodeSchema, required: true },
    expectedOutputs: { type: [String], default: [] } // helper matching check expectations list
  },
  { timestamps: true }
);

export const ProblemModel: mongoose.Model<any> = mongoose.models.Problem || mongoose.model("Problem", ProblemSchema);
