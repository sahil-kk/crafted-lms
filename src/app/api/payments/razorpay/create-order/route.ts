import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { Student } from "@/models/Student";
import { getRazorpayClient } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    const { user } = authResult;
    await connectDB();

    const body = await req.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json({ message: "paymentId is required" }, { status: 400 });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return NextResponse.json({ message: "Invoice / Payment record not found" }, { status: 404 });
    }

    if (payment.status === "paid") {
      return NextResponse.json({ message: "This invoice is already paid" }, { status: 400 });
    }

    // Role-based authorization
    if (user.role === "student") {
      const allowedIds = [user.id, user.studentId].filter(Boolean).map(String);
      if (!allowedIds.includes(String(payment.studentId))) {
        return NextResponse.json({ message: "Unauthorized to pay for this invoice" }, { status: 403 });
      }
    } else if (user.role === "parent") {
      // Find parent record to verify linked student
      const parentDoc = await User.findById(user.id);
      let linkedStudentDoc: any = null;
      if (parentDoc?.linkedStudentId) {
        linkedStudentDoc = await Student.findById(parentDoc.linkedStudentId);
      }
      const allowedIds = [
        parentDoc?.linkedStudentId?.toString(),
        linkedStudentDoc?.studentId,
        linkedStudentDoc?._id?.toString(),
      ].filter(Boolean);

      if (!allowedIds.includes(String(payment.studentId))) {
        return NextResponse.json({ message: "Unauthorized to pay for this invoice" }, { status: 403 });
      }
    } else if (user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const razorpay = getRazorpayClient();
    const amountInPaise = Math.round(Number(payment.amount) * 100);

    // Razorpay receipt has a 40 character limit
    const receiptId = `rcpt_${payment._id.toString().slice(-20)}_${Date.now().toString().slice(-10)}`;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: payment.currency || "INR",
      receipt: receiptId,
      notes: {
        paymentId: payment._id.toString(),
        studentId: String(payment.studentId),
        studentName: payment.studentName,
        classGrade: payment.classGrade || "",
      },
    });

    payment.razorpayOrderId = order.id;
    await payment.save();

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      payment: {
        id: payment._id.toString(),
        studentName: payment.studentName,
        studentId: payment.studentId,
        amount: payment.amount,
        classGrade: payment.classGrade,
        dueDate: payment.dueDate,
      },
    });
  } catch (err: any) {
    console.error("Razorpay order creation error:", err);
    const statusCode = err.statusCode || (err.error?.code === "BAD_REQUEST_ERROR" ? 400 : 500);
    const errorDescription =
      err.error?.description ||
      (err.statusCode === 401
        ? "Razorpay authentication failed: Invalid Key ID or Secret. Please verify keys in environment settings."
        : err.message || "Failed to create Razorpay order");

    return NextResponse.json(
      {
        message: errorDescription,
        code: err.error?.code || "ORDER_CREATION_FAILED",
      },
      { status: statusCode }
    );
  }
}
