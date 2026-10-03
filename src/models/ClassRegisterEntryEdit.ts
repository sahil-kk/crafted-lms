import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClassRegisterEntryEdit extends Document {
  entryId: mongoose.Types.ObjectId;
  editedBy: mongoose.Types.ObjectId;
  fieldChanged: string;
  oldValue: string;
  newValue: string;
  reason?: string;
  createdAt: Date;
}

const ClassRegisterEntryEditSchema = new Schema<IClassRegisterEntryEdit>(
  {
    entryId: { type: Schema.Types.ObjectId, ref: "ClassRegisterEntry", required: true },
    editedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fieldChanged: { type: String, required: true },
    oldValue: { type: String, default: "" },
    newValue: { type: String, default: "" },
    reason: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ClassRegisterEntryEdit: Model<IClassRegisterEntryEdit> =
  mongoose.models.ClassRegisterEntryEdit ||
  mongoose.model<IClassRegisterEntryEdit>("ClassRegisterEntryEdit", ClassRegisterEntryEditSchema);

export default ClassRegisterEntryEdit;
