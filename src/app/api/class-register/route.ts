import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClassRegisterEntry } from "@/models/ClassRegisterEntry";
import { ClassRegisterEntryEdit } from "@/models/ClassRegisterEntryEdit";
import { ScheduledSlot } from "@/models/ScheduledSlot";
import { SyllabusItem } from "@/models/SyllabusItem";
import { requireAuth } from "@/lib/auth";
import mongoose from "mongoose";

// GET /api/class-register
// Filter by teacherId, studentId, dateFrom, dateTo, period (YYYY-MM), status
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if ("error" in authResult && authResult.error) return authResult.error;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId");
    const studentId = searchParams.get("studentId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const period = searchParams.get("period"); // YYYY-MM
    const status = searchParams.get("status");

    const query: any = {};

    if (authResult.user.role === "teacher") {
      query.teacherId = authResult.user.id;
    } else if (teacherId) {
      query.teacherId = teacherId;
    }

    if (studentId) query.studentId = studentId;
    if (status) query.status = status;

    if (period) {
      query.sessionDate = { $regex: `^${period}` };
    } else if (dateFrom || dateTo) {
      query.sessionDate = {};
      if (dateFrom) query.sessionDate.$gte = dateFrom;
      if (dateTo) query.sessionDate.$lte = dateTo;
    }

    const entries = await ClassRegisterEntry.find(query)
      .populate("teacherId", "name email username subject")
      .populate("studentId", "name username studentId phone")
      .populate("syllabusItemIds", "topicName chapter plannedOrder")
      .sort({ sessionDate: -1, startTime: -1 })
      .lean();

    return NextResponse.json({ success: true, entries });
  } catch (error: any) {
    console.error("GET /api/class-register error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to fetch entries" }, { status: 500 });
  }
}

// POST /api/class-register
// Submit a session confirmation or a one-off session
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["teacher", "admin"]);
    if ("error" in authResult && authResult.error) return authResult.error;

    await connectDB();
    const body = await req.json();
    let {
      teacherId,
      studentId,
      subject,
      sessionDate,
      startTime,
      durationHours,
      status,
      topicsCovered,
      syllabusItemIds,
      note,
      isOneOff,
      scheduledSlotId,
    } = body;

    if (authResult.user.role === "teacher") {
      teacherId = authResult.user.id;
    }

    if (!teacherId || !studentId || !subject || !sessionDate || !topicsCovered) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: teacherId, studentId, subject, sessionDate, topicsCovered" },
        { status: 400 }
      );
    }

    const period = sessionDate.substring(0, 7); // "YYYY-MM"

    // Prevent duplicate submission for the same scheduled slot on the same date
    if (scheduledSlotId) {
      const existing = await ClassRegisterEntry.findOne({
        scheduledSlotId: new mongoose.Types.ObjectId(scheduledSlotId),
        sessionDate,
      });
      if (existing) {
        return NextResponse.json(
          { success: false, message: "This scheduled session has already been logged for this date." },
          { status: 409 }
        );
      }
    }

    const entry = await ClassRegisterEntry.create({
      teacherId: new mongoose.Types.ObjectId(teacherId),
      studentId: new mongoose.Types.ObjectId(studentId),
      subject,
      sessionDate,
      startTime: startTime || "10:00",
      durationHours: durationHours || 1.5,
      status: status || "completed",
      topicsCovered,
      syllabusItemIds: syllabusItemIds && syllabusItemIds.length > 0 ? syllabusItemIds : [],
      note: note || "",
      isOneOff: Boolean(isOneOff),
      scheduledSlotId: scheduledSlotId ? new mongoose.Types.ObjectId(scheduledSlotId) : null,
      submittedAt: new Date(),
      payrollLocked: false,
      payrollPeriod: period,
    });

    // If session is completed and syllabus items are linked, mark them as covered
    if (status === "completed" && syllabusItemIds && syllabusItemIds.length > 0) {
      await SyllabusItem.updateMany(
        { _id: { $in: syllabusItemIds } },
        {
          $set: {
            isCovered: true,
            coveredAt: new Date(),
            coveredByTeacherId: new mongoose.Types.ObjectId(teacherId),
          },
        }
      );
    }

    const populated = await ClassRegisterEntry.findById(entry._id)
      .populate("teacherId", "name email username subject")
      .populate("studentId", "name username studentId phone")
      .populate("syllabusItemIds", "topicName chapter plannedOrder")
      .lean();

    return NextResponse.json({ success: true, entry: populated }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/class-register error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to save entry" }, { status: 500 });
  }
}
