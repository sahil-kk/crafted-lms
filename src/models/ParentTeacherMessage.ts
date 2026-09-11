import mongoose, { Schema, Document, Model } from "mongoose";

export interface IParentTeacherMessage extends Document {
  parent: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  subject: string;
  message: string;
  status: "sent" | "read" | "replied";
  createdAt: Date;
  updatedAt: Date;
}

const ParentTeacherMessageSchema = new Schema<IParentTeacherMessage>(
  {
    parent: { type: Schema.Types.ObjectId, ref: "User", required: true },
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    teacher: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["sent", "read", "replied"], default: "sent" },
  },
  { timestamps: true }
);

export const ParentTeacherMessage: Model<IParentTeacherMessage> =
  mongoose.models.ParentTeacherMessage ||
  mongoose.model<IParentTeacherMessage>("ParentTeacherMessage", ParentTeacherMessageSchema);
export default ParentTeacherMessage;
