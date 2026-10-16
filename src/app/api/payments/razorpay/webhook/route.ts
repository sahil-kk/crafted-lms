import { NextRequest, NextResponse, after } from "next/server";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Student } from "@/models/Student";
import { User } from "@/models/User";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { sendFeeReceiptEmail } from "@/lib/resend";
import { sendPaymentNotificationToAccounts } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ message: "Missing x-razorpay-signature header" }, { status: 400 });
    }

    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ message: "Invalid webhook signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    await connectDB();

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;

      const orderId = paymentEntity?.order_id || orderEntity?.id;
      const paymentId = paymentEntity?.id;
      const notesPaymentId = paymentEntity?.notes?.paymentId || orderEntity?.notes?.paymentId;

      let payment = null;
      if (notesPaymentId) {
        payment = await Payment.findById(notesPaymentId);
      }
      if (!payment && orderId) {
        payment = await Payment.findOne({ razorpayOrderId: orderId });
      }

      if (payment && payment.status !== "paid") {
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
        const receiptNumber = `CRF-${displayStudentId}-${seq}`;

        payment.status = "paid";
        payment.paidAt = new Date();
        if (orderId) payment.razorpayOrderId = orderId;
        if (paymentId) payment.razorpayPaymentId = paymentId;
        payment.receiptNumber = payment.receiptNumber || receiptNumber;
        if (paymentEntity?.method) payment.paymentMethod = paymentEntity.method;
        await payment.save();

        // Dispatch fee receipt email in background
        const savedPayment = payment;
        after(async () => {
          try {
            const studentDoc = await Student.findOne({
              $or: [{ _id: savedPayment.studentId }, { studentId: savedPayment.studentId }],
            }).lean();

            const userDoc = await User.findOne({
              $or: [{ _id: savedPayment.studentId }, { studentId: savedPayment.studentId }],
            }).lean();

            const studentEmail = (studentDoc as any)?.email || (userDoc as any)?.email;

            let parentEmail: string | undefined;
            const parentUser = await User.findOne({
              role: "parent",
              $or: [
                { linkedStudentId: savedPayment.studentId },
                { linkedStudentId: (studentDoc as any)?._id },
                { studentId: savedPayment.studentId },
              ],
            }).lean();

            if (parentUser?.email) {
              parentEmail = parentUser.email;
            }

            const primaryEmail = studentEmail || parentEmail;
            if (primaryEmail) {
              await sendFeeReceiptEmail({
                studentName: savedPayment.studentName,
                studentId: displayStudentId,
                recipientEmail: primaryEmail,
                parentEmail: parentEmail && parentEmail !== primaryEmail ? parentEmail : undefined,
                amount: savedPayment.amount,
                receiptNumber: savedPayment.receiptNumber,
                paymentId: paymentId || "pay_verified",
                orderId: orderId || "N/A",
                classGrade: savedPayment.classGrade,
                paymentMethod: savedPayment.paymentMethod || "Razorpay (Online)",
                paidAt: savedPayment.paidAt,
                description: savedPayment.description,
              });
            }

            await sendPaymentNotificationToAccounts({
              studentName: savedPayment.studentName,
              studentId: displayStudentId,
              amount: savedPayment.amount,
              receiptNumber: savedPayment.receiptNumber,
              paymentId: paymentId || "pay_verified",
              orderId: orderId || "N/A",
              classGrade: savedPayment.classGrade,
              paymentMethod: savedPayment.paymentMethod || "Razorpay (Online)",
              paidAt: savedPayment.paidAt,
              description: savedPayment.description,
            });
          } catch (err) {
            console.error("Webhook fee receipt email dispatch error:", err);
          }
        });
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    console.error("Razorpay webhook handling error:", err);
    return NextResponse.json({ message: err.message || "Webhook error" }, { status: 500 });
  }
}
