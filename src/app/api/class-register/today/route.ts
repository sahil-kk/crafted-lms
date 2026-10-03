import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ScheduledSlot } from "@/models/ScheduledSlot";
import { ClassRegisterEntry } from "@/models/ClassRegisterEntry";
import { requireAuth } from "@/lib/auth";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// GET /api/class-register/today
// Returns today's expected scheduled slots for the logged in teacher and indicates which are already confirmed
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["teacher", "admin"]);
    if ("error" in authResult && authResult.error) return authResult.error;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // YYYY-MM-DD or defaults to today
    const teacherIdParam = searchParams.get("teacherId");

    let teacherId = authResult.user.role === "teacher" ? authResult.user.id : teacherIdParam;

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const dateString = dateParam || targetDate.toISOString().split("T")[0];
    const dayOfWeek = DAYS[targetDate.getDay()];

    const slotQuery: any = { dayOfWeek, status: "active" };
    if (teacherId) slotQuery.teacherId = teacherId;

    const slots = await ScheduledSlot.find(slotQuery)
      .populate("teacherId", "name email username subject")
      .populate("studentId", "name username studentId phone")
      .sort({ startTime: 1 })
      .lean();

    // Check which slots have already been logged for this date
    const registerQuery: any = { sessionDate: dateString };
    if (teacherId) registerQuery.teacherId = teacherId;

    const loggedEntries = await ClassRegisterEntry.find(registerQuery)
      .populate("syllabusItemIds", "topicName chapter plannedOrder")
      .lean();

    const loggedSlotMap = new Map();
    loggedEntries.forEach((e) => {
      if (e.scheduledSlotId) {
        loggedSlotMap.set(e.scheduledSlotId.toString(), e);
      }
    });

    const combined = slots.map((s: any) => ({
      slot: s,
      loggedEntry: loggedSlotMap.get(s._id.toString()) || null,
      isConfirmed: Boolean(loggedSlotMap.get(s._id.toString())),
    }));

    return NextResponse.json({
      success: true,
      date: dateString,
      dayOfWeek,
      items: combined,
      loggedCount: loggedEntries.length,
      totalSlots: slots.length,
    });
  } catch (error: any) {
    console.error("GET /api/class-register/today error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to fetch today's sessions" }, { status: 500 });
  }
}
