import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClassRegisterEntry extends Document {
  teacherId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  subject: string;
  sessionDate: string; // YYYY-MM-DD
  startTime: string; // e.g. "16:00"
  durationHours: number; // default 1.5
  status: "completed" | "student_absent" | "teacher_cancelled" | "rescheduled";
  topicsCovered: string; // Free text topic description
  syllabusItemIds?: mongoose.Types.ObjectId[];
  note?: string; // What went well, homework given, pending topics
  isOneOff: boolean; // true if added manually outside weekly timetable
  scheduledSlotId?: mongoose.Types.ObjectId | null;
  submittedAt: Date;
  payrollLocked: boolean; // locked once month is finalized
  payrollPeriod?: string; // YYYY-MM
  createdAt: Date;
  updatedAt: Date;
}

const ClassRegisterEntrySchema = new Schema<IClassRegisterEntry>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    sessionDate: { type: String, required: true },
    startTime: { type: String, required: true },
    durationHours: { type: Number, default: 1.5 },
    status: {
      type: String,
      enum: ["completed", "student_absent", "teacher_cancelled", "rescheduled"],
      required: true,
      default: "completed",
    },
    topicsCovered: { type: String, required: true },
    syllabusItemIds: [{ type: Schema.Types.ObjectId, ref: "SyllabusItem" }],
    note: { type: String, default: "" },
    isOneOff: { type: Boolean, default: false },
    scheduledSlotId: { type: Schema.Types.ObjectId, ref: "ScheduledSlot", default: null },
    submittedAt: { type: Date, default: Date.now },
    payrollLocked: { type: Boolean, default: false },
    payrollPeriod: { type: String, default: "" }, // e.g. "2026-10"
  },
  { timestamps: true }
);

export const ClassRegisterEntry: Model<IClassRegisterEntry> =
  mongoose.models.ClassRegisterEntry ||
  mongoose.model<IClassRegisterEntry>("ClassRegisterEntry", ClassRegisterEntrySchema);

export default ClassRegisterEntry;
