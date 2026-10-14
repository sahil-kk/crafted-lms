import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  date: string;
  studentId?: string | null;
  studentIds?: string[];
  category?: "general" | "academic" | "fee" | "class";
  authorRole?: "admin" | "teacher";
  authorId?: mongoose.Types.ObjectId | string | null;
  is_global?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    date: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },
    studentId: {
      type: String,
      default: null,
      index: true,
    },
    studentIds: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      enum: ["general", "academic", "fee", "class"],
      default: "general",
    },
    authorRole: {
      type: String,
      enum: ["admin", "teacher"],
      default: "admin",
    },
    authorId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    is_global: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Announcement: Model<IAnnouncement> =
  mongoose.models.Announcement || mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);
export default Announcement;
