import mongoose from "mongoose";

const resultSchema = new mongoose.Schema({
  email: { type: String, index: true },
  rollNumber: { type: String, index: true },
  testId: String,
  totalScore: Number,
  answers: Object, 
  submissionTime: { type: Date, default: Date.now }
});

export default mongoose.model("ExamResult", resultSchema);