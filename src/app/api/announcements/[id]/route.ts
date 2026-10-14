import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Announcement } from "@/models/Announcement";
import { serverCache } from "@/lib/cache";

// PUT update announcement (requires admin or teacher)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { title, content, priority, date, is_global, studentId, studentIds, category } = body;
    const finalContent = content || body.body;

    const updateFields: any = {
      ...(title && { title }),
      ...(finalContent && { content: finalContent }),
      ...(priority && { priority }),
      ...(date && { date }),
      ...(category && { category }),
    };

    if (is_global !== undefined) updateFields.is_global = Boolean(is_global);
    if (studentId !== undefined) updateFields.studentId = studentId;
    if (studentIds !== undefined && Array.isArray(studentIds)) updateFields.studentIds = studentIds;

    const updated = await Announcement.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ message: "Announcement not found" }, { status: 404 });
    }

    serverCache.invalidateTags(["bootstrap"]);
    serverCache.clear();

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

export const PATCH = PUT;

// DELETE announcement (requires admin or teacher)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const deleted = await Announcement.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Announcement not found" }, { status: 404 });
    }

    serverCache.invalidateTags(["bootstrap"]);
    serverCache.clear();

    return NextResponse.json({ message: "Announcement deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
