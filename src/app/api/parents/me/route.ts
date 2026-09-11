import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import { User } from "@/models/User";
import { Result } from "@/models/Result";
import { Timetable } from "@/models/Timetable";
import { Exam } from "@/models/Exam";
import { RecordedClass } from "@/models/RecordedClass";
import { ParentActivityControl } from "@/models/ParentActivityControl";
import { ParentTeacherMessage } from "@/models/ParentTeacherMessage";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const tokenUser = getUserFromToken(req);
    if (!tokenUser || tokenUser.role !== "parent") {
      return NextResponse.json({ message: "Parent access required" }, { status: 403 });
    }

    const parent = await User.findOne({ _id: tokenUser.id, role: "parent" })
      .populate("linkedStudentId")
      .select("-password");

    if (!parent) return NextResponse.json({ message: "Parent account not found" }, { status: 404 });
    if (!parent.linkedStudentId) return NextResponse.json({ message: "Linked student not found" }, { status: 404 });

    const student = parent.linkedStudentId as any;
    const studentObjectId = student._id;

    const [results, timetables, exams, recordedClasses, teachers, controls, messages] = await Promise.all([
      Result.find({ studentId: { $in: [studentObjectId.toString(), student.studentId] } }).sort({ createdAt: -1 }),
      Timetable.find({
        $or: [
          { studentId: { $in: [studentObjectId.toString(), student.studentId] } },
          { batch: student.batch },
          { studentId: { $exists: false }, batch: { $exists: false } },
          { studentId: null, batch: null },
          { studentId: "", batch: "" },
        ],
      }).sort({ createdAt: -1 }),
      Exam.find({
        $or: [
          { studentId: { $in: [studentObjectId.toString(), student.studentId] } },
          { studentId: null },
        ],
      }).sort({ createdAt: -1 }),
      RecordedClass.find().populate("course_id").sort({ createdAt: -1 }),
      User.find({ role: "teacher", status: "active" }).select("name email phone subject profilePhoto"),
      ParentActivityControl.findOne({ parent: parent._id, student: studentObjectId }),
      ParentTeacherMessage.find({ parent: parent._id, student: studentObjectId })
        .populate("teacher", "name email subject")
        .sort({ createdAt: -1 }),
    ]);

    return NextResponse.json({
      student: {
        id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        phone: student.phone,
        course: student.course,
        batch: student.batch,
        status: student.status,
        profilePhoto: student.profilePhoto,
        classLink: student.classLink,
        assignedCourses: student.assignedCourses,
      },
      parent: {
        id: parent._id,
        name: parent.name,
        email: parent.email,
        phone: parent.phone,
        relationship: parent.relationship,
      },
      results,
      timetables,
      exams,
      recordedClasses,
      teachers,
      controls: controls || {
        dailyStudyGoalMinutes: 90,
        maxPracticeTestsPerDay: 2,
        allowRecordedClasses: true,
        allowPracticeExams: true,
        allowWeekendStudy: true,
        focusSubjects: [],
        notes: "",
      },
      messages,
    });
  } catch (err: any) {
    console.error("GET /parents/me error:", err);
    return NextResponse.json({ message: err.message || "Failed to fetch parent dashboard" }, { status: 500 });
  }
}
