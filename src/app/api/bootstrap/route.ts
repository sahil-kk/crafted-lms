import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Student } from "@/models/Student";
import { User } from "@/models/User";
import { Course } from "@/models/Course";
import { Announcement } from "@/models/Announcement";
import { Exam } from "@/models/Exam";
import { RecordedClass } from "@/models/RecordedClass";
import { Result } from "@/models/Result";
import { Timetable } from "@/models/Timetable";
import { Payment } from "@/models/Payment";

export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) {
      return authResult.error;
    }

    const { user } = authResult;
    await connectDB();

    const isAdmin = user.role === "admin";

    const [students, teachers, parents, courses, announcements, exams, classes, results, timetables, payments] =
      await Promise.all([
        Student.find().sort({ createdAt: -1 }).select("-password").lean(),
        User.find({ role: "teacher" }).select("-password").sort({ createdAt: -1 }).lean(),
        User.find({ role: "parent" }).populate("linkedStudentId").select("-password").sort({ createdAt: -1 }).lean(),
        Course.find().sort({ classGrade: 1, subject: 1 }).lean(),
        Announcement.find().sort({ createdAt: -1 }).lean(),
        Exam.find().sort({ createdAt: -1 }).lean(),
        RecordedClass.find().populate("course_id").sort({ createdAt: -1 }).lean(),
        Result.find().sort({ date: -1 }).lean(),
        Timetable.find().lean(),
        // Sensitive financial records: only accessible to admin
        isAdmin ? Payment.find().sort({ dueDate: -1 }).lean() : Promise.resolve([]),
      ]);

    return NextResponse.json({
      students,
      teachers,
      parents,
      courses,
      announcements,
      exams,
      classes,
      results,
      timetables,
      payments,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
