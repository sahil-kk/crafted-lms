import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Result } from "@/models/Result";

export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    const { user } = authResult;
    await connectDB();
    const { studentId, subject, examType, score, maxScore, grade, date, trend } = await req.json();

    if (!studentId || !subject || score === undefined || maxScore === undefined) {
      return NextResponse.json({ message: "Student ID, subject, score, and maxScore are required" }, { status: 400 });
    }

    // Role check: Admin and Teacher can add results for any student.
    // Students can only add their own exam results.
    const isSelf = user.id === studentId || user.studentId === studentId;
    if (user.role !== "admin" && user.role !== "teacher" && !isSelf) {
      return NextResponse.json({ message: "Access forbidden: insufficient permissions" }, { status: 403 });
    }

    const newResult = new Result({
      studentId,
      subject,
      examType: examType || "Final Exam",
      score,
      maxScore,
      grade: grade || (score / maxScore >= 0.8 ? "A" : score / maxScore >= 0.6 ? "B" : "C"),
      date: date || new Date(),
      trend: trend || "+0%",
    });

    await newResult.save();
    return NextResponse.json(newResult, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
