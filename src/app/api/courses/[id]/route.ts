import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Course } from "@/models/Course";

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
    const course = await Course.findByIdAndDelete(id);
    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Course deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
