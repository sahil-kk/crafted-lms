import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRecordedClass extends Document {
  title: string;
  description?: string;
  youtube_id: string;
  course_id?: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

const RecordedClassSchema = new Schema<IRecordedClass>({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  youtube_id: { type: String, required: true },
  course_id: { type: Schema.Types.ObjectId, ref: "Course", default: null },
  createdAt: { type: Date, default: Date.now },
});

export const RecordedClass: Model<IRecordedClass> =
  mongoose.models.RecordedClass || mongoose.model<IRecordedClass>("RecordedClass", RecordedClassSchema);
export default RecordedClass;
