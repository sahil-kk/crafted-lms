import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Payment } from "@/models/Payment";
import { Student } from "@/models/Student";
import { User } from "@/models/User";
import { generateFeeReceiptPdf } from "@/lib/pdfReceipt";
import mongoose from "mongoose";

export async function GET(
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

    // Lookup student details
    const studentDoc = await Student.findOne({
      $or: [{ _id: payment.studentId }, { studentId: payment.studentId }],
    }).lean();

    const userDoc = await User.findOne({
      $or: [{ _id: payment.studentId }, { studentId: payment.studentId }],
    }).lean();

    const studentName = payment.studentName || (studentDoc as any)?.name || (userDoc as any)?.name || "Student";
    const studentCode = (studentDoc as any)?.studentId || (userDoc as any)?.studentId || payment.studentId || "C1001";

    let receiptNumber = payment.receiptNumber;
    if (!receiptNumber) {
      receiptNumber = `CRF-${studentCode}-01`;
    }

    const pdfBuffer = generateFeeReceiptPdf({
      studentName,
      studentId: studentCode,
      amount: payment.amount,
      receiptNumber,
      paymentId: payment.razorpayPaymentId || "pay_verified",
      orderId: payment.razorpayOrderId || "N/A",
      classGrade: payment.classGrade,
      paymentMethod: payment.paymentMethod || "Razorpay (Online)",
      paidAt: payment.paidAt || new Date(),
      description: payment.description || "Tuition & Course Academic Fee",
    });

    const filename = `Crafted_Fee_Receipt_${receiptNumber}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("GET /api/payments/[id]/pdf error:", err);
    return NextResponse.json({ message: err.message || "Failed to generate receipt PDF" }, { status: 500 });
  }
}
