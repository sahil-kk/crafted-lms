import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Course } from "@/models/Course";
import { getTeacherScope } from "@/lib/mentorSync";

// GET single course
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    if (authResult.user.role === "teacher") {
      const scope = await getTeacherScope(authResult.user.id);
      if (course.subject.toLowerCase() !== scope.subject.toLowerCase()) {
        return NextResponse.json({ message: "Access forbidden: not your subject" }, { status: 403 });
      }
      if (course.studentId && !scope.allStudentIdentifiers.includes(course.studentId.toString())) {
        return NextResponse.json({ message: "Access forbidden: student not assigned to you" }, { status: 403 });
      }
    }

    return NextResponse.json(course);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// DELETE course (requires admin or teacher)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    if (authResult.user.role === "teacher") {
      const scope = await getTeacherScope(authResult.user.id);
      if (course.subject.toLowerCase() !== scope.subject.toLowerCase()) {
        return NextResponse.json({ message: "Access forbidden: cannot delete course for another subject" }, { status: 403 });
      }
      if (course.studentId && !scope.allStudentIdentifiers.includes(course.studentId.toString())) {
        return NextResponse.json({ message: "Access forbidden: student not assigned to you" }, { status: 403 });
      }
    }

    await Course.findByIdAndDelete(id);
    return NextResponse.json({ message: "Course deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
