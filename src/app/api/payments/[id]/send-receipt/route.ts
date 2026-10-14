import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Payment } from "@/models/Payment";
import { Student } from "@/models/Student";
import { User } from "@/models/User";
import { sendFeeReceiptEmail } from "@/lib/resend";
import mongoose from "mongoose";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;

    let payment = null;
    if (mongoose.isValidObjectId(id)) {
      payment = await Payment.findById(id);
    }
    if (!payment) {
      payment = await Payment.findOne({ $or: [{ _id: id }, { id: id }] }).catch(() => null);
    }

    if (!payment) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }

    // Authorization: Admin can send for anyone. Students can only send for their own payments.
    const { user } = authResult;
    if (user.role === "student") {
      const studentMatches =
        payment.studentId === user.id ||
        payment.studentId === user.studentId ||
        payment.studentId === (user as any)._id?.toString();
      if (!studentMatches) {
        return NextResponse.json({ message: "Unauthorized access to this receipt" }, { status: 403 });
      }
    }

    if (payment.status !== "paid") {
      return NextResponse.json(
        { message: "Receipt cannot be emailed for an unpaid or pending invoice" },
        { status: 400 }
      );
    }

    // Lookup student details
    const studentDoc = await Student.findOne({
      $or: [{ _id: payment.studentId }, { studentId: payment.studentId }],
    }).lean();

    const userDoc = await User.findOne({
      $or: [{ _id: payment.studentId }, { studentId: payment.studentId }],
    }).lean();

    const studentEmail = (studentDoc as any)?.email || (userDoc as any)?.email;
    const studentName = payment.studentName || (studentDoc as any)?.name || (userDoc as any)?.name || "Student";
    const studentCode = (studentDoc as any)?.studentId || (userDoc as any)?.studentId || payment.studentId;

    // Lookup parent email if linked
    let parentEmail: string | undefined;
    const parentUser = await User.findOne({
      role: "parent",
      $or: [
        { linkedStudentId: payment.studentId },
        { linkedStudentId: (studentDoc as any)?._id },
        { studentId: payment.studentId },
      ],
    }).lean();

    if (parentUser?.email) {
      parentEmail = parentUser.email;
    }

    const primaryEmail = studentEmail || parentEmail;
    if (!primaryEmail) {
      return NextResponse.json(
        { message: "No email address found for this student or parent" },
        { status: 400 }
      );
    }

    // Ensure receipt number exists
    if (!payment.receiptNumber) {
      const priorCount = await Payment.countDocuments({
        studentId: payment.studentId,
        status: "paid",
        _id: { $ne: payment._id },
      });
      const seq = String(priorCount + 1).padStart(2, "0");
      payment.receiptNumber = `CRF-${studentCode}-${seq}`;
      await payment.save();
    }

    const result = await sendFeeReceiptEmail({
      studentName,
      studentId: studentCode,
      recipientEmail: primaryEmail,
      parentEmail: parentEmail && parentEmail !== primaryEmail ? parentEmail : undefined,
      amount: payment.amount,
      receiptNumber: payment.receiptNumber,
      paymentId: payment.razorpayPaymentId || "pay_verified",
      orderId: payment.razorpayOrderId || "N/A",
      classGrade: payment.classGrade,
      paymentMethod: payment.paymentMethod || "Razorpay (Online)",
      paidAt: payment.paidAt || payment.updatedAt,
      description: payment.description,
    });

    if (result.simulated) {
      return NextResponse.json(
        {
          success: false,
          simulated: true,
          message: "Email could not be delivered: RESEND_API_KEY is not configured in your production server environment variables (e.g. Vercel Project Settings).",
        },
        { status: 400 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { message: result.error || "Failed to send receipt email via Resend" },
        { status: 500 }
      );
    }

    const recipients = [studentEmail, parentEmail].filter(Boolean).join(" & ");

    return NextResponse.json({
      success: true,
      message: `Receipt #${payment.receiptNumber} emailed successfully to ${recipients}`,
    });
  } catch (err: any) {
    console.error("POST /api/payments/[id]/send-receipt error:", err);
    return NextResponse.json(
      { message: err.message || "Failed to send receipt email" },
      { status: 500 }
    );
  }
}
