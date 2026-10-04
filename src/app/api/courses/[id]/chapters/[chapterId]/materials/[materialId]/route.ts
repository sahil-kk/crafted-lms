import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Course } from "@/models/Course";

// DELETE /api/courses/[id]/chapters/[chapterId]/materials/[materialId]?type=note|assignment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string; materialId: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id, chapterId, materialId } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "note";

    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    if (authResult.user.role === "teacher") {
      const { getTeacherScope } = await import("@/lib/mentorSync");
      const scope = await getTeacherScope(authResult.user.id);
      if (course.subject.toLowerCase() !== scope.subject.toLowerCase()) {
        return NextResponse.json({ message: "Access forbidden: cannot delete materials for another subject" }, { status: 403 });
      }
      if (course.studentId && !scope.allStudentIdentifiers.includes(course.studentId.toString())) {
        return NextResponse.json({ message: "Access forbidden: student not assigned to you" }, { status: 403 });
      }
    }

    const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
    if (!chapter) {
      return NextResponse.json({ message: "Chapter not found" }, { status: 404 });
    }

    if (type === "assignment") {
      chapter.assignments = chapter.assignments.filter((a: any) => a._id.toString() !== materialId);
    } else {
      chapter.notes = chapter.notes.filter((n: any) => n._id.toString() !== materialId);
    }

    await course.save();

    return NextResponse.json({
      message: `${type === "assignment" ? "Assignment" : "Note"} deleted successfully`,
      course,
    });
  } catch (err: any) {
    console.error("Material delete error:", err);
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
