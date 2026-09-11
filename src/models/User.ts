import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  username?: string;
  studentId?: string;
  email?: string;
  name?: string;
  password: string;
  role: "admin" | "student" | "teacher" | "parent";
  phone?: string;
  subject?: string;
  linkedStudentId?: mongoose.Types.ObjectId;
  relationship?: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: function (this: any) {
        return this.role === "admin" || this.role === "teacher" || this.role === "parent";
      },
    },
    studentId: {
      type: String,
      required: function (this: any) {
        return this.role === "student";
      },
    },
    email: { type: String },
    name: { type: String },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "student", "teacher", "parent"], required: true },
    phone: { type: String, default: "" },
    subject: { type: String, default: "" },
    linkedStudentId: { type: Schema.Types.ObjectId, ref: "Student", default: null },
    relationship: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
