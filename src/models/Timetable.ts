import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITimetable extends Document {
  day: string;
  time: string;
  subject: string;
  teacher: string;
  studentId?: string | null;
  batch?: string | null;
}

const TimetableSchema = new Schema<ITimetable>(
  {
    day: { type: String, required: true },
    time: { type: String, required: true },
    subject: { type: String, required: true },
    teacher: { type: String, required: true },
    studentId: { type: String, default: null },
    batch: { type: String, default: null },
  },
  { timestamps: true }
);

export const Timetable: Model<ITimetable> = mongoose.models.Timetable || mongoose.model<ITimetable>("Timetable", TimetableSchema);
export default Timetable;
