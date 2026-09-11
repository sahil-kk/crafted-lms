import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Course } from "@/models/Course";

// POST add chapter (requires admin or teacher)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const { title } = await req.json();

    if (!title) {
      return NextResponse.json({ message: "Chapter title is required" }, { status: 400 });
    }

    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    course.chapters.push({ title, notes: [], assignments: [] });
    await course.save();

    return NextResponse.json({ message: "Chapter added successfully", course }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
