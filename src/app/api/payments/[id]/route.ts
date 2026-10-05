import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Payment } from "@/models/Payment";
import { Student } from "@/models/Student";
import { serverCache } from "@/lib/cache";
import { sendPaymentNotificationToAccounts } from "@/lib/mailer";

// PUT update payment (requires admin)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const { status, paidAt, amount, dueDate, paymentMethod, description, receiptNumber } = await req.json();

    const payment = await Payment.findById(id);
    if (!payment) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }

    if (status) payment.status = status;
    if (amount !== undefined) payment.amount = Number(amount);
    if (dueDate) payment.dueDate = new Date(dueDate);
    if (description !== undefined) payment.description = description;

    if (status === "paid") {
      payment.paidAt = paidAt ? new Date(paidAt) : new Date();
      payment.paymentMethod = paymentMethod || payment.paymentMethod || "Admin Confirmed (Offline/UPI)";

      // Generate receipt number if not yet assigned
      if (!payment.receiptNumber && !receiptNumber) {
        let displayStudentId = String(payment.studentId);
        try {
          const studentDoc = await Student.findOne({
            $or: [{ _id: payment.studentId }, { studentId: payment.studentId }],
          });
          if (studentDoc?.studentId) {
            displayStudentId = studentDoc.studentId;
          }
        } catch {}

        const priorCount = await Payment.countDocuments({
          studentId: payment.studentId,
          status: "paid",
          _id: { $ne: payment._id },
        });
        const seq = String(priorCount + 1).padStart(2, "0");
        payment.receiptNumber = `CRF-${displayStudentId}-${seq}`;
      } else if (receiptNumber) {
        payment.receiptNumber = receiptNumber;
      }

      // Notify accounts
      sendPaymentNotificationToAccounts({
        studentName: payment.studentName,
        studentId: payment.studentId,
        amount: payment.amount,
        receiptNumber: payment.receiptNumber,
        paymentId: payment.razorpayPaymentId || "Admin Manual",
        orderId: payment.razorpayOrderId || "N/A",
        classGrade: payment.classGrade,
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt,
        description: payment.description,
      }).catch(console.error);
    } else if (paidAt !== undefined) {
      payment.paidAt = paidAt ? new Date(paidAt) : undefined;
    }

    await payment.save();

    serverCache.invalidateTags(["bootstrap"]);
    serverCache.clear();

    const payload = {
      ...payment.toObject(),
      id: payment._id.toString(),
      _id: payment._id.toString(),
    };

    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

export const PATCH = PUT;

// DELETE payment (requires admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const deleted = await Payment.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }
    serverCache.invalidateTags(["bootstrap"]);
    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
