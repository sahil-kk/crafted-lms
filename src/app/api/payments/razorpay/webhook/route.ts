import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Student } from "@/models/Student";
import { verifyWebhookSignature } from "@/lib/razorpay";

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
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    console.error("Razorpay webhook handling error:", err);
    return NextResponse.json({ message: err.message || "Webhook error" }, { status: 500 });
  }
}
