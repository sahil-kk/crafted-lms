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
import { serverCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) {
      return authResult.error;
    }

    const { user } = authResult;

    // Check server memory cache for this user/role
    const cacheKey = `bootstrap_${user.id}_${user.role}`;
    const cachedData = serverCache.get<any>(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          "X-Cache": "HIT",
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      });
    }

    await connectDB();

    const isAdmin = user.role === "admin";
    let paymentsPromise: Promise<any>;
    if (isAdmin) {
      paymentsPromise = Payment.find().sort({ dueDate: -1 }).lean();
    } else if (user.role === "student") {
      const studentIds: string[] = [user.id, user.studentId].filter((id): id is string => Boolean(id));
      paymentsPromise = Payment.find({ studentId: { $in: studentIds } }).sort({ dueDate: -1 }).lean();
    } else if (user.role === "parent") {
      paymentsPromise = (async () => {
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
        return Payment.find({ studentId: { $in: Array.from(new Set(studentIds)) } }).sort({ dueDate: -1 }).lean();
      })();
    } else {
      paymentsPromise = Promise.resolve([]);
    }

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
        paymentsPromise,
      ]);

    const responsePayload = {
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
    };

    // Store in server memory cache for 30s
    serverCache.set(cacheKey, responsePayload, 30, ["bootstrap", `bootstrap_${user.role}`]);

    return NextResponse.json(responsePayload, {
      headers: {
        "X-Cache": "MISS",
        "Cache-Control": "private, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
