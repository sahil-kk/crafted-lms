import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Course } from "@/models/Course";

// DELETE chapter (requires admin or teacher)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id, chapterId } = await params;

    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    course.chapters = course.chapters.filter((ch: any) => ch._id.toString() !== chapterId);
    await course.save();

    return NextResponse.json({ message: "Chapter deleted successfully", course });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
