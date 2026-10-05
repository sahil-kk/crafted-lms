import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Payment } from "@/models/Payment";

import { User } from "@/models/User";
import { Student } from "@/models/Student";
import { serverCache } from "@/lib/cache";

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
      const studentIds: string[] = [user.id, user.studentId].filter((id): id is string => Boolean(id));
      try {
        const studentDoc = await Student.findOne({
          $or: [{ _id: user.id }, { studentId: user.studentId || user.id }],
        }).lean();
        if (studentDoc) {
          if (studentDoc._id) studentIds.push(studentDoc._id.toString());
          if (studentDoc.studentId) studentIds.push(studentDoc.studentId);
        }
      } catch {}
      query = { studentId: { $in: Array.from(new Set(studentIds)) } };
    } else if (user.role === "parent") {
      const studentIds: string[] = [];
      if (user.studentId) studentIds.push(String(user.studentId));
      const parentUser = await User.findById(user.id);
      if (parentUser?.linkedStudentId) {
        studentIds.push(parentUser.linkedStudentId.toString());
        const linkedStudent = await Student.findById(parentUser.linkedStudentId);
        if (linkedStudent) {
          if (linkedStudent.studentId) studentIds.push(linkedStudent.studentId);
          if (linkedStudent._id) studentIds.push(linkedStudent._id.toString());
        }
      }
      query = { studentId: { $in: Array.from(new Set(studentIds)) } };
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
    const { studentId, studentName, amount, status, dueDate, paidAt, classGrade, batch, description } = await req.json();

    if (!studentId || !studentName || amount === undefined || !dueDate) {
      return NextResponse.json({ message: "Student ID, student name, amount, and due date are required" }, { status: 400 });
    }

    const newPayment = new Payment({
      studentId,
      studentName,
      amount: Number(amount),
      status: status || "pending",
      dueDate: new Date(dueDate),
      paidAt: paidAt ? new Date(paidAt) : undefined,
      classGrade: classGrade || "",
      batch: batch || "",
      description: description || "Tuition & Course Academic Fee",
    });
    await newPayment.save();
    serverCache.invalidateTags(["bootstrap"]);
    serverCache.clear();

    const returnObj = {
      ...newPayment.toObject(),
      id: newPayment._id.toString(),
      _id: newPayment._id.toString(),
    };
    return NextResponse.json(returnObj, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
