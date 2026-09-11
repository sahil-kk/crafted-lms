import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Announcement } from "@/models/Announcement";

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
    const { title, content, priority, date } = await req.json();

    const updated = await Announcement.findByIdAndUpdate(
      id,
      {
        ...(title && { title }),
        ...(content && { content }),
        ...(priority && { priority }),
        ...(date && { date }),
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ message: "Announcement not found" }, { status: 404 });
    }

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
    return NextResponse.json({ message: "Announcement deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
