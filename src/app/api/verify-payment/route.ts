import { NextRequest, NextResponse } from "next/server";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Student } from "@/models/Student";
import { serverCache } from "@/lib/cache";
import { sendPaymentNotificationToAccounts } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const order_id = body.order_id || body.razorpay_order_id;
    const payment_id = body.payment_id || body.razorpay_payment_id;
    const razorpay_signature = body.razorpay_signature || body.signature;
    const lmsPaymentId = body.paymentId || body.payment_invoice_id;

    if (!order_id || !payment_id || !razorpay_signature) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields: order_id, razorpay_payment_id, and razorpay_signature are required",
        },
        { status: 400 }
      );
    }

    const isValid = verifyPaymentSignature({
      orderId: order_id,
      paymentId: payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment verification failed: signature mismatch",
        },
        { status: 400 }
      );
    }

    // If an associated LMS invoice paymentId exists or can be found by order_id, update it in MongoDB
    try {
      await connectDB();
      let paymentRecord = null;
      if (lmsPaymentId) {
        paymentRecord = await Payment.findById(lmsPaymentId);
      }
      if (!paymentRecord && order_id) {
        paymentRecord = await Payment.findOne({ razorpayOrderId: order_id });
      }

      if (paymentRecord && paymentRecord.status !== "paid") {
        let displayStudentId = String(paymentRecord.studentId);
        try {
          const studentDoc = await Student.findOne({
            $or: [{ _id: paymentRecord.studentId }, { studentId: paymentRecord.studentId }],
          });
          if (studentDoc?.studentId) {
            displayStudentId = studentDoc.studentId;
          }
        } catch {}

        const priorCount = await Payment.countDocuments({
          studentId: paymentRecord.studentId,
          status: "paid",
          _id: { $ne: paymentRecord._id },
        });
        const seq = String(priorCount + 1).padStart(2, "0");
        const receiptNumber = `CRF-${displayStudentId}-${seq}`;

        paymentRecord.status = "paid";
        paymentRecord.paidAt = new Date();
        paymentRecord.razorpayOrderId = order_id;
        paymentRecord.razorpayPaymentId = payment_id;
        paymentRecord.razorpaySignature = razorpay_signature;
        paymentRecord.receiptNumber = paymentRecord.receiptNumber || receiptNumber;
        await paymentRecord.save();

        serverCache.invalidateTags(["bootstrap"]);
        serverCache.clear();

        sendPaymentNotificationToAccounts({
          studentName: paymentRecord.studentName,
          studentId: displayStudentId,
          amount: paymentRecord.amount,
          receiptNumber: paymentRecord.receiptNumber,
          paymentId: payment_id,
          orderId: order_id,
          classGrade: paymentRecord.classGrade,
          paymentMethod: "Razorpay (Online)",
          paidAt: paymentRecord.paidAt,
          description: paymentRecord.description,
        }).catch(console.error);
      }
    } catch (dbErr) {
      // Log DB error but don't fail verification if DB is offline
      console.warn("DB update during verify-payment warning:", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      order_id,
      payment_id,
    });
  } catch (err: any) {
    console.error("Razorpay /api/verify-payment error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to verify signature" },
      { status: 500 }
    );
  }
}
