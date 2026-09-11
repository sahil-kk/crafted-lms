import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { RecordedClass } from "@/models/RecordedClass";

// PUT update class (requires admin or teacher)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const { title, description, youtube_id, course_id } = await req.json();

    const updated = await RecordedClass.findByIdAndUpdate(
      id,
      {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(youtube_id && { youtube_id }),
        course_id: course_id || null,
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ message: "Class not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

export const PATCH = PUT;

// DELETE class (requires admin or teacher)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const deleted = await RecordedClass.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Class not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Class deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
