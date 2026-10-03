import mongoose, { Schema, Document, Model } from "mongoose";

export interface IScheduledSlot extends Document {
  teacherId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  subject: string;
  dayOfWeek: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  startTime: string; // e.g. "16:00"
  durationHours: number; // default 1.5
  status: "active" | "inactive";
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledSlotSchema = new Schema<IScheduledSlot>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    dayOfWeek: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      required: true,
    },
    startTime: { type: String, required: true },
    durationHours: { type: Number, default: 1.5 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: { type: Date, default: null },
  },
  { timestamps: true }
);

export const ScheduledSlot: Model<IScheduledSlot> =
  mongoose.models.ScheduledSlot || mongoose.model<IScheduledSlot>("ScheduledSlot", ScheduledSlotSchema);

export default ScheduledSlot;
