import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExamQuestion {
  id: string;
  exam_id?: string;
  question_text: string;
  question_type: "mcq" | "short" | "long";
  marks: number;
  options: string[] | null;
  correct_answer: string | null;
  position: number;
}

export interface IExam extends Document {
  subject: string;
  title: string;
  date: string;
  studentId?: string | null;
  pdf?: string;
  exam_type: string;
  starts_at?: string | null;
  duration_minutes: number;
  questions?: IExamQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema<IExam>(
  {
    subject: { type: String, required: true },
    title: { type: String, required: true },
    date: { type: String },
    studentId: { type: String, default: null },
    pdf: { type: String },
    exam_type: { type: String, default: "unit_test" },
    starts_at: { type: String, default: null },
    duration_minutes: { type: Number, default: 60 },
    questions: [
      {
        id: { type: String, required: true },
        question_text: { type: String, required: true },
        question_type: { type: String, default: "mcq" },
        marks: { type: Number, default: 1 },
        options: { type: [String], default: null },
        correct_answer: { type: String, default: null },
        position: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

export const Exam: Model<IExam> = mongoose.models.Exam || mongoose.model<IExam>("Exam", ExamSchema);
export default Exam;
