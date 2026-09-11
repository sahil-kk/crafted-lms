import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Student } from "@/models/Student";
import { User } from "@/models/User";
import { Course } from "@/models/Course";
import { Exam } from "@/models/Exam";
import { Result } from "@/models/Result";
import { Payment } from "@/models/Payment";

export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const [totalStudents, totalTeachers, totalParents, totalCourses, totalExams, results, payments] = await Promise.all([
      Student.countDocuments(),
      User.countDocuments({ role: "teacher" }),
      User.countDocuments({ role: "parent" }),
      Course.countDocuments(),
      Exam.countDocuments(),
      Result.find(),
      Payment.find(),
    ]);

    const totalRevenue = payments
      .filter((p) => p.status === "paid")
      .reduce((acc, p) => acc + (p.amount || 0), 0);

    const pendingRevenue = payments
      .filter((p) => p.status === "pending" || p.status === "overdue")
      .reduce((acc, p) => acc + (p.amount || 0), 0);

    const avgExamScore =
      results.length > 0
        ? Math.round(
            (results.reduce((acc, r) => acc + (r.score / (r.maxScore || 100)) * 100, 0) / results.length)
          )
        : 0;

    return NextResponse.json({
      totalStudents,
      totalTeachers,
      totalParents,
      totalCourses,
      totalExams,
      totalRevenue,
      pendingRevenue,
      avgExamScore,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
