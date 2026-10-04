import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireAuth, sanitizeUser } from "@/lib/auth";
import { Student } from "@/models/Student";
import { User } from "@/models/User";
import { Result } from "@/models/Result";
import { Timetable } from "@/models/Timetable";
import { Payment } from "@/models/Payment";
import { ParentActivityControl } from "@/models/ParentActivityControl";
import { ParentTeacherMessage } from "@/models/ParentTeacherMessage";
import { getTeacherScope, assignMentorToStudent, unassignMentorFromStudent } from "@/lib/mentorSync";

// GET single student (requires authenticated user)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;

    if (authResult.user.role === "teacher") {
      const scope = await getTeacherScope(authResult.user.id);
      if (!scope.assignedStudentIdStrings.includes(id)) {
        return NextResponse.json({ message: "Access forbidden: student is not assigned to you" }, { status: 403 });
      }
    }

    const student = await Student.findById(id).select("-password");
    if (!student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }
    return NextResponse.json(student);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// PUT update student (requires admin or the student themselves)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    const { user } = authResult;
    await connectDB();
    const { id } = await params;

    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    // Authorization check: only admin or the student themselves can edit
    const isOwner = user.id === id || user.studentId === student.studentId;
    if (user.role !== "admin" && !isOwner) {
      return NextResponse.json({ message: "Access forbidden: insufficient permissions" }, { status: 403 });
    }

    const { name, email, phone, course, status, batch, assignedCourses, classLink, password, mentorAssignments } = await req.json();

    if (email && email !== student.email) {
      const existingEmail = await Student.findOne({ email, _id: { $ne: id } });
      if (existingEmail) {
        return NextResponse.json({ message: "Email already exists" }, { status: 400 });
      }
      student.email = email;
    }

    if (name) student.name = name;
    if (phone !== undefined) student.phone = phone;
    // Only admin can change course/status/batch/assignedCourses/mentorAssignments
    if (user.role === "admin") {
      if (course) student.course = course;
      if (status) student.status = status;
      if (batch) student.batch = batch;
      if (assignedCourses) student.assignedCourses = assignedCourses;

      if (Array.isArray(mentorAssignments)) {
        const currentAssignments = student.mentorAssignments || [];
        const currentItems = currentAssignments.map((a: any) => ({
          subject: a.subject,
          teacherId: a.teacherId?.toString(),
        }));

        const newSubjectMap = new Map<string, string>();
        for (const item of mentorAssignments) {
          if (item.subject && item.teacherId) {
            newSubjectMap.set(item.subject.toLowerCase(), item.teacherId.toString());
            await assignMentorToStudent(student._id, item.teacherId, item.subject);
          }
        }

        for (const curr of currentItems) {
          if (!newSubjectMap.has(curr.subject.toLowerCase()) || newSubjectMap.get(curr.subject.toLowerCase()) !== curr.teacherId) {
            if (curr.teacherId) {
              await unassignMentorFromStudent(student._id, curr.teacherId, curr.subject);
            }
          }
        }

        const refreshed = await Student.findById(id);
        if (refreshed) {
          student.mentorAssignments = refreshed.mentorAssignments;
        }
      }
    }
    if (classLink !== undefined) student.classLink = classLink;

    if (password && password.trim()) {
      student.password = await bcrypt.hash(password, 10);
    }

    await student.save();
    return NextResponse.json({
      message: "Student updated successfully",
      student: sanitizeUser(student),
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

export const PATCH = PUT;

// DELETE student (requires admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const student = await Student.findByIdAndDelete(id);
    if (!student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    // Cascade delete linked entities & teacher assignments
    await User.updateMany(
      { role: "teacher", assignedStudents: id },
      { $pull: { assignedStudents: id } }
    );
    await User.deleteMany({ role: "parent", linkedStudentId: id });
    await Result.deleteMany({ studentId: id });
    await Timetable.deleteMany({ studentId: id });
    await Payment.deleteMany({ studentId: id });
    await ParentActivityControl.deleteMany({ student: id });
    await ParentTeacherMessage.deleteMany({ student: id });

    return NextResponse.json({ message: "Student deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
