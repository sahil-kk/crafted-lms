import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Timetable } from "@/models/Timetable";

// GET all timetables (requires authenticated session)
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    await connectDB();
    const timetable = await Timetable.find();
    return NextResponse.json(timetable);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// POST create timetable entry (requires admin or teacher)
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { day, time, subject, teacher, studentId, batch } = await req.json();

    if (!day || !time || !subject || !teacher) {
      return NextResponse.json({ message: "Day, time, subject, and teacher are required" }, { status: 400 });
    }

    const newEntry = new Timetable({
      day,
      time,
      subject,
      teacher,
      studentId: studentId || null,
      batch: batch || null,
    });

    await newEntry.save();
    return NextResponse.json(newEntry, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
