import mongoose, { Schema, Document, Model } from "mongoose";

export interface IParentActivityControl extends Document {
  parent: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  dailyStudyGoalMinutes: number;
  maxPracticeTestsPerDay: number;
  allowRecordedClasses: boolean;
  allowPracticeExams: boolean;
  allowWeekendStudy: boolean;
  focusSubjects: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParentActivityControlSchema = new Schema<IParentActivityControl>(
  {
    parent: { type: Schema.Types.ObjectId, ref: "User", required: true },
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    dailyStudyGoalMinutes: { type: Number, default: 90, min: 0 },
    maxPracticeTestsPerDay: { type: Number, default: 2, min: 0 },
    allowRecordedClasses: { type: Boolean, default: true },
    allowPracticeExams: { type: Boolean, default: true },
    allowWeekendStudy: { type: Boolean, default: true },
    focusSubjects: { type: [String], default: [] },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

ParentActivityControlSchema.index({ parent: 1, student: 1 }, { unique: true });

export const ParentActivityControl: Model<IParentActivityControl> =
  mongoose.models.ParentActivityControl ||
  mongoose.model<IParentActivityControl>("ParentActivityControl", ParentActivityControlSchema);
export default ParentActivityControl;
