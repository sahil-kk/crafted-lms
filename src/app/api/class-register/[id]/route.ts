import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClassRegisterEntry } from "@/models/ClassRegisterEntry";
import { ClassRegisterEntryEdit } from "@/models/ClassRegisterEntryEdit";
import { requireAuth } from "@/lib/auth";
import mongoose from "mongoose";

// PATCH /api/class-register/[id]
// Allows modifying an entry; if modified, an audit log is created
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["teacher", "admin"]);
    if ("error" in authResult && authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const entry = await ClassRegisterEntry.findById(id);
    if (!entry) {
      return NextResponse.json({ success: false, message: "Entry not found" }, { status: 404 });
    }

    // Check if payroll is locked
    if (entry.payrollLocked && authResult.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Cannot edit this entry because payroll for this month has been finalized." },
        { status: 403 }
      );
    }

    if (authResult.user.role === "teacher" && entry.teacherId.toString() !== authResult.user.id) {
      return NextResponse.json({ success: false, message: "Unauthorized to edit this entry" }, { status: 403 } );
    }

    const fieldsToTrack: (keyof typeof body)[] = ["status", "topicsCovered", "note", "durationHours"];
    const editsToCreate = [];

    for (const field of fieldsToTrack) {
      if (body[field] !== undefined && (entry as any)[field] !== body[field]) {
        editsToCreate.push({
          entryId: entry._id,
          editedBy: new mongoose.Types.ObjectId(authResult.user.id),
          fieldChanged: field,
          oldValue: String((entry as any)[field] || ""),
          newValue: String(body[field]),
          reason: body.editReason || "Updated entry details",
        });
        (entry as any)[field] = body[field];
      }
    }

    if (body.syllabusItemIds) {
      entry.syllabusItemIds = body.syllabusItemIds;
    }

    await entry.save();

    if (editsToCreate.length > 0) {
      await ClassRegisterEntryEdit.insertMany(editsToCreate);
    }

    const updated = await ClassRegisterEntry.findById(entry._id)
      .populate("teacherId", "name email username subject")
      .populate("studentId", "name username studentId phone")
      .populate("syllabusItemIds", "topicName chapter plannedOrder")
      .lean();

    return NextResponse.json({ success: true, entry: updated });
  } catch (error: any) {
    console.error("PATCH /api/class-register/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to update entry" }, { status: 500 });
  }
}
