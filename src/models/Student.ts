import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMentorAssignment {
  subject: string;
  teacherId: mongoose.Types.ObjectId;
}

export interface IStudent extends Document {
  studentId: string;
  password: string;
  name: string;
  email: string;
  phone?: string;
  course: string; // Class / Grade: 8th - 12th
  batch?: string;
  assignedCourses: string[];
  mentorAssignments?: IMentorAssignment[];
  status: "active" | "inactive";
  profilePhoto?: string;
  classLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    studentId: { type: String, required: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    course: { type: String, required: true },
    batch: { type: String, default: "Batch 1" },
    assignedCourses: { type: [String], default: ["Physics", "Chemistry", "Biology", "Mathematics"] },
    mentorAssignments: [
      {
        subject: { type: String, required: true },
        teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    profilePhoto: { type: String, default: "" },
    classLink: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Student: Model<IStudent> = mongoose.models.Student || mongoose.model<IStudent>("Student", StudentSchema);
export default Student;
