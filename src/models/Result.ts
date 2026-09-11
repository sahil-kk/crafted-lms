import mongoose, { Schema, Document, Model } from "mongoose";

export interface IResult extends Document {
  studentId: string;
  subject: string;
  examType: string;
  score: number;
  maxScore: number;
  grade?: string;
  date: Date;
  trend?: string;
}

const ResultSchema = new Schema<IResult>(
  {
    studentId: { type: String, required: true },
    subject: { type: String, required: true },
    examType: { type: String, required: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    grade: { type: String },
    date: { type: Date, default: Date.now },
    trend: { type: String },
  },
  { timestamps: true }
);

export const Result: Model<IResult> = mongoose.models.Result || mongoose.model<IResult>("Result", ResultSchema);
export default Result;
