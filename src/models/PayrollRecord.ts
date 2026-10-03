import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayrollRecord extends Document {
  teacherId: mongoose.Types.ObjectId;
  periodMonth: string; // YYYY-MM
  totalSessions: number;
  rateApplied: number; // per session
  grossAmount: number;
  adjustments: number; // positive or negative
  adjustmentReason?: string;
  netAmount: number;
  status: "draft" | "finalized";
  finalizedBy?: mongoose.Types.ObjectId | null;
  finalizedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollRecordSchema = new Schema<IPayrollRecord>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    periodMonth: { type: String, required: true },
    totalSessions: { type: Number, default: 0 },
    rateApplied: { type: Number, default: 0 },
    grossAmount: { type: Number, default: 0 },
    adjustments: { type: Number, default: 0 },
    adjustmentReason: { type: String, default: "" },
    netAmount: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "finalized"], default: "draft" },
    finalizedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    finalizedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Unique compound index so there is at most one record per teacher per month
PayrollRecordSchema.index({ teacherId: 1, periodMonth: 1 }, { unique: true });

export const PayrollRecord: Model<IPayrollRecord> =
  mongoose.models.PayrollRecord || mongoose.model<IPayrollRecord>("PayrollRecord", PayrollRecordSchema);

export default PayrollRecord;
