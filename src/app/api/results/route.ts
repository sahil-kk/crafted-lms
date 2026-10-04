import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, escapeRegex } from "@/lib/auth";
import { Result } from "@/models/Result";
import { User } from "@/models/User";
import { Student } from "@/models/Student";
import { getTeacherScope } from "@/lib/mentorSync";

// GET all results (requires authenticated session)
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { user } = authResult;
    let query: any = {};

    if (user.role === "teacher") {
      const scope = await getTeacherScope(user.id);
      if (scope.allStudentIdentifiers.length === 0) {
        return NextResponse.json([]);
      }
      query = {
        subject: { $regex: new RegExp(`^${escapeRegex(scope.subject)}$`, "i") },
        studentId: { $in: scope.allStudentIdentifiers },
      };
    } else if (user.role === "student") {
      const studentIds = [user.id, user.studentId].filter((id): id is string => Boolean(id));
      query = { studentId: { $in: studentIds } };
    } else if (user.role === "parent") {
      const parentUser = await User.findById(user.id);
      const studentIds: string[] = [];
      if (user.studentId) studentIds.push(String(user.studentId));
      if (parentUser?.linkedStudentId) {
        studentIds.push(parentUser.linkedStudentId.toString());
        const linked = await Student.findById(parentUser.linkedStudentId);
        if (linked?.studentId) studentIds.push(linked.studentId);
      }
      query = { studentId: { $in: studentIds } };
    }

    const results = await Result.find(query).sort({ date: -1 });
    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// POST create result (requires admin or teacher, or student for self)
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

    const isSelf = user.id === studentId || user.studentId === studentId;
    if (user.role !== "admin" && user.role !== "teacher" && !isSelf) {
      return NextResponse.json({ message: "Access forbidden: insufficient permissions" }, { status: 403 });
    }

    let finalSubject = subject;
    if (user.role === "teacher") {
      const scope = await getTeacherScope(user.id);
      finalSubject = scope.subject || "Physics";
      if (!scope.allStudentIdentifiers.includes(studentId)) {
        return NextResponse.json(
          { message: "Access forbidden: you can only publish results for your assigned students" },
          { status: 403 }
        );
      }
    }

    const newResult = new Result({
      studentId,
      subject: finalSubject,
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
