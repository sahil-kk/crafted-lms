import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Payment } from "@/models/Payment";
import { Student } from "@/models/Student";
import { verifyPaymentSignature } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    await connectDB();
    const body = await req.json();
    const { paymentId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!paymentId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { message: "Missing required payment verification details" },
        { status: 400 }
      );
    }

    const isValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Payment signature verification failed" },
        { status: 400 }
      );
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return NextResponse.json({ message: "Payment record not found" }, { status: 404 });
    }

    // Resolve clean student ID (e.g. C1002)
    let displayStudentId = String(payment.studentId);
    try {
      const studentDoc = await Student.findOne({
        $or: [{ _id: payment.studentId }, { studentId: payment.studentId }],
      });
      if (studentDoc?.studentId) {
        displayStudentId = studentDoc.studentId;
      }
    } catch {}

    // Calculate sequential index for this student
    const priorCount = await Payment.countDocuments({
      studentId: payment.studentId,
      status: "paid",
      _id: { $ne: payment._id },
    });
    const seq = String(priorCount + 1).padStart(2, "0");
    const receiptNumber = `CRF-${displayStudentId}-${seq}`;

    payment.status = "paid";
    payment.paidAt = new Date();
    payment.razorpayOrderId = razorpay_order_id;
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.receiptNumber = payment.receiptNumber || receiptNumber;

    await payment.save();

    return NextResponse.json({
      success: true,
      message: "Payment verified and recorded successfully",
      payment,
    });
  } catch (err: any) {
    console.error("Razorpay verification error:", err);
    return NextResponse.json(
      { message: err.message || "Failed to verify Razorpay payment" },
      { status: 500 }
    );
  }
}
