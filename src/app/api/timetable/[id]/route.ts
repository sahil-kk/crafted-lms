import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Timetable } from "@/models/Timetable";

// PUT update timetable entry (requires admin or teacher)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const { day, time, subject, teacher, studentId, batch } = await req.json();

    const updated = await Timetable.findByIdAndUpdate(
      id,
      {
        ...(day && { day }),
        ...(time && { time }),
        ...(subject && { subject }),
        ...(teacher && { teacher }),
        studentId: studentId || null,
        batch: batch || null,
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ message: "Timetable entry not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

export const PATCH = PUT;

// DELETE timetable entry (requires admin or teacher)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const deleted = await Timetable.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Timetable entry not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Timetable entry deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
