import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayment extends Document {
  studentId: string;
  studentName: string;
  amount: number;
  currency?: string;
  status: "paid" | "pending" | "overdue";
  dueDate: Date;
  paidAt?: Date;
  classGrade?: string;
  batch?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["paid", "pending", "overdue"], default: "pending" },
    dueDate: { type: Date, required: true },
    paidAt: { type: Date },
    classGrade: { type: String },
    batch: { type: String },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    paymentMethod: { type: String },
    receiptNumber: { type: String },
  },
  { timestamps: true }
);

export const Payment: Model<IPayment> = mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
export default Payment;
