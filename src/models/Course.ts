import mongoose, { Schema, Document, Model } from "mongoose";

export interface INote {
  title: string;
  fileUrl: string;
  createdAt?: Date;
}

export interface IAssignment {
  title: string;
  fileUrl: string;
  createdAt?: Date;
}

export interface IChapter {
  title: string;
  notes: INote[];
  assignments: IAssignment[];
}

export interface ICourse extends Document {
  classGrade: string; // "8th", "9th", "10th", "11th", "12th"
  subject: string;    // "Physics", "Chemistry", "Biology", "Mathematics"
  chapters: IChapter[];
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    classGrade: { type: String, required: true },
    subject: { type: String, required: true },
    chapters: [
      {
        title: { type: String, required: true },
        notes: [
          {
            title: { type: String, required: true },
            fileUrl: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
          },
        ],
        assignments: [
          {
            title: { type: String, required: true },
            fileUrl: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

export const Course: Model<ICourse> = mongoose.models.Course || mongoose.model<ICourse>("Course", CourseSchema);
export default Course;
