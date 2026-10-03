import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISyllabusItem extends Document {
  subject: string;
  studentId?: mongoose.Types.ObjectId | null; // Optional: individual syllabus or general
  topicName: string;
  chapter?: string;
  plannedOrder: number;
  targetWeekOrDate?: string;
  isCovered: boolean;
  coveredAt?: Date | null;
  coveredByTeacherId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const SyllabusItemSchema = new Schema<ISyllabusItem>(
  {
    subject: { type: String, required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    topicName: { type: String, required: true },
    chapter: { type: String, default: "" },
    plannedOrder: { type: Number, default: 0 },
    targetWeekOrDate: { type: String, default: "" },
    isCovered: { type: Boolean, default: false },
    coveredAt: { type: Date, default: null },
    coveredByTeacherId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const SyllabusItem: Model<ISyllabusItem> =
  mongoose.models.SyllabusItem || mongoose.model<ISyllabusItem>("SyllabusItem", SyllabusItemSchema);

export default SyllabusItem;
