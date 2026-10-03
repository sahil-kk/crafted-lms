import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ScheduledSlot } from "@/models/ScheduledSlot";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["teacher", "admin"]);
    if ("error" in authResult && authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;

    const slot = await ScheduledSlot.findById(id);
    if (!slot) {
      return NextResponse.json({ success: false, message: "Slot not found" }, { status: 404 });
    }

    if (authResult.user.role === "teacher" && slot.teacherId.toString() !== authResult.user.id) {
      return NextResponse.json({ success: false, message: "Not authorized to delete this slot" }, { status: 403 });
    }

    slot.status = "inactive";
    slot.effectiveTo = new Date();
    await slot.save();

    return NextResponse.json({ success: true, message: "Slot deactivated successfully" });
  } catch (error: any) {
    console.error("DELETE /api/weekly-timetable/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to remove slot" }, { status: 500 });
  }
}
