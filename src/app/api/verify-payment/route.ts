import { NextRequest, NextResponse } from "next/server";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Student } from "@/models/Student";
import { User } from "@/models/User";
import { serverCache } from "@/lib/cache";
import { sendPaymentNotificationToAccounts } from "@/lib/mailer";
import { sendFeeReceiptEmail } from "@/lib/resend";

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

        // 1. Dispatch fee receipt email to student and linked parent via Resend
        (async () => {
          try {
            const studentDoc = await Student.findOne({
              $or: [{ _id: paymentRecord.studentId }, { studentId: paymentRecord.studentId }],
            }).lean();

            const userDoc = await User.findOne({
              $or: [{ _id: paymentRecord.studentId }, { studentId: paymentRecord.studentId }],
            }).lean();

            const studentEmail = (studentDoc as any)?.email || (userDoc as any)?.email;

            let parentEmail: string | undefined;
            const parentUser = await User.findOne({
              role: "parent",
              $or: [
                { linkedStudentId: paymentRecord.studentId },
                { linkedStudentId: (studentDoc as any)?._id },
                { studentId: paymentRecord.studentId },
              ],
            }).lean();

            if (parentUser?.email) {
              parentEmail = parentUser.email;
            }

            const primaryEmail = studentEmail || parentEmail;
            if (primaryEmail) {
              await sendFeeReceiptEmail({
                studentName: paymentRecord.studentName,
                studentId: displayStudentId,
                recipientEmail: primaryEmail,
                parentEmail: parentEmail && parentEmail !== primaryEmail ? parentEmail : undefined,
                amount: paymentRecord.amount,
                receiptNumber: paymentRecord.receiptNumber,
                paymentId: payment_id,
                orderId: order_id,
                classGrade: paymentRecord.classGrade,
                paymentMethod: "Razorpay (Online)",
                paidAt: paymentRecord.paidAt,
                description: paymentRecord.description,
              });
            }
          } catch (receiptErr) {
            console.error("Resend fee receipt error in verify-payment:", receiptErr);
          }
        })().catch(console.error);

        // 2. Send confirmation notification to Crafted accounts email (accounts@craftedlearn.com)
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
