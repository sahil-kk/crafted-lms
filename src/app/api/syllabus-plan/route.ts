import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SyllabusItem } from "@/models/SyllabusItem";
import { requireAuth } from "@/lib/auth";
import mongoose from "mongoose";

// GET /api/syllabus-plan?subject=&studentId=
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if ("error" in authResult && authResult.error) return authResult.error;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const studentId = searchParams.get("studentId");

    const query: any = {};
    if (subject) query.subject = { $regex: new RegExp(`^${subject}$`, "i") };
    if (studentId) {
      query.$or = [{ studentId: new mongoose.Types.ObjectId(studentId) }, { studentId: null }];
    }

    const items = await SyllabusItem.find(query)
      .populate("studentId", "name studentId")
      .populate("coveredByTeacherId", "name")
      .sort({ plannedOrder: 1, createdAt: 1 })
      .lean();

    // Rollup statistics
    const total = items.length;
    const covered = items.filter((i) => i.isCovered).length;
    const progressPercent = total > 0 ? Math.round((covered / total) * 100) : 0;

    return NextResponse.json({
      success: true,
      items,
      stats: {
        total,
        covered,
        pending: total - covered,
        progressPercent,
      },
    });
  } catch (error: any) {
    console.error("GET /api/syllabus-plan error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to fetch syllabus" }, { status: 500 });
  }
}

// POST /api/syllabus-plan
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if ("error" in authResult && authResult.error) return authResult.error;

    await connectDB();
    const body = await req.json();
    const { subject, studentId, topicName, chapter, plannedOrder, targetWeekOrDate } = body;

    if (!subject || !topicName) {
      return NextResponse.json({ success: false, message: "subject and topicName are required" }, { status: 400 });
    }

    const item = await SyllabusItem.create({
      subject,
      studentId: studentId ? new mongoose.Types.ObjectId(studentId) : null,
      topicName,
      chapter: chapter || "",
      plannedOrder: Number(plannedOrder) || 0,
      targetWeekOrDate: targetWeekOrDate || "",
      isCovered: false,
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/syllabus-plan error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to create syllabus item" }, { status: 500 });
  }
}
