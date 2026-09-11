import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Payment } from "@/models/Payment";

// GET payments (filtered by user role)
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    const { user } = authResult;
    await connectDB();

    let query: any = {};
    if (user.role === "admin") {
      query = {}; // Admin sees all
    } else if (user.role === "student") {
      query = { studentId: { $in: [user.id, user.studentId] } };
    } else if (user.role === "parent") {
      query = user.studentId ? { studentId: user.studentId } : { _id: null };
    } else {
      return NextResponse.json([]);
    }

    const payments = await Payment.find(query).sort({ dueDate: -1 });
    return NextResponse.json(payments);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// POST create payment record (requires admin)
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { studentId, studentName, amount, status, dueDate, paidAt, classGrade, batch } = await req.json();

    if (!studentId || !studentName || amount === undefined || !dueDate) {
      return NextResponse.json({ message: "Student ID, student name, amount, and due date are required" }, { status: 400 });
    }

    const newPayment = new Payment({
      studentId,
      studentName,
      amount,
      status: status || "pending",
      dueDate: new Date(dueDate),
      paidAt: paidAt ? new Date(paidAt) : undefined,
      classGrade: classGrade || "",
      batch: batch || "",
    });

    await newPayment.save();
    return NextResponse.json(newPayment, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
