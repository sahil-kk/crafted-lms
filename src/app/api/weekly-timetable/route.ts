import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ScheduledSlot } from "@/models/ScheduledSlot";
import { requireAuth } from "@/lib/auth";
import mongoose from "mongoose";

// GET: fetch weekly scheduled slots (filterable by teacherId, studentId, dayOfWeek)
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if ("error" in authResult && authResult.error) return authResult.error;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId");
    const studentId = searchParams.get("studentId");
    const dayOfWeek = searchParams.get("dayOfWeek");

    const query: any = { status: "active" };

    if (authResult.user.role === "teacher") {
      query.teacherId = authResult.user.id;
    } else if (teacherId) {
      query.teacherId = teacherId;
    }

    if (studentId) query.studentId = studentId;
    if (dayOfWeek) query.dayOfWeek = dayOfWeek;

    const slots = await ScheduledSlot.find(query)
      .populate("teacherId", "name email username subject")
      .populate("studentId", "name username studentId phone")
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

    return NextResponse.json({ success: true, slots });
  } catch (error: any) {
    console.error("GET /api/weekly-timetable error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to fetch slots" }, { status: 500 });
  }
}

// POST: Add a new weekly slot
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["teacher", "admin"]);
    if ("error" in authResult && authResult.error) return authResult.error;

    await connectDB();
    const body = await req.json();
    let { teacherId, studentId, subject, dayOfWeek, startTime, durationHours } = body;

    // If teacher, force teacherId to their own id
    if (authResult.user.role === "teacher") {
      teacherId = authResult.user.id;
    }

    if (!teacherId || !studentId || !subject || !dayOfWeek || !startTime) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: teacherId, studentId, subject, dayOfWeek, startTime" },
        { status: 400 }
      );
    }

    // Check for duplicate slot collision for the same teacher on the same day and time
    const existing = await ScheduledSlot.findOne({
      teacherId: new mongoose.Types.ObjectId(teacherId),
      dayOfWeek,
      startTime,
      status: "active",
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `A session is already scheduled on ${dayOfWeek} at ${startTime} for this mentor.` },
        { status: 409 }
      );
    }

    const slot = await ScheduledSlot.create({
      teacherId: new mongoose.Types.ObjectId(teacherId),
      studentId: new mongoose.Types.ObjectId(studentId),
      subject,
      dayOfWeek,
      startTime,
      durationHours: durationHours || 1.5,
      status: "active",
      effectiveFrom: new Date(),
    });

    const populated = await ScheduledSlot.findById(slot._id)
      .populate("teacherId", "name email username subject")
      .populate("studentId", "name username studentId phone")
      .lean();

    return NextResponse.json({ success: true, slot: populated }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/weekly-timetable error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to create slot" }, { status: 500 });
  }
}
