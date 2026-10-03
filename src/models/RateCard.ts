import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRateCard extends Document {
  teacherId: mongoose.Types.ObjectId;
  ratePerSession: number; // in INR
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const RateCardSchema = new Schema<IRateCard>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ratePerSession: { type: Number, required: true, min: 0 },
    effectiveFrom: { type: Date, required: true, default: Date.now },
    effectiveTo: { type: Date, default: null },
  },
  { timestamps: true }
);

export const RateCard: Model<IRateCard> =
  mongoose.models.RateCard || mongoose.model<IRateCard>("RateCard", RateCardSchema);

export default RateCard;
