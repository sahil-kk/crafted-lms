import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClassRegisterEntry } from "@/models/ClassRegisterEntry";
import { RateCard } from "@/models/RateCard";
import { PayrollRecord } from "@/models/PayrollRecord";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/auth";
import mongoose from "mongoose";

// GET /api/payroll
// Admin/Teacher query to see payroll rollups and generated records
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if ("error" in authResult && authResult.error) return authResult.error;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || new Date().toISOString().substring(0, 7); // "YYYY-MM"
    const teacherId = searchParams.get("teacherId");

    let targetTeacherId = authResult.user.role === "teacher" ? authResult.user.id : teacherId;

    // 1. Fetch any finalized/draft PayrollRecord records for this period
    const recordQuery: any = { periodMonth: period };
    if (targetTeacherId) recordQuery.teacherId = targetTeacherId;

    const existingRecords = await PayrollRecord.find(recordQuery)
      .populate("teacherId", "name email username subject phone")
      .populate("finalizedBy", "name email")
      .lean();

    const recordMap = new Map();
    existingRecords.forEach((r) => recordMap.set(r.teacherId?._id?.toString() || r.teacherId?.toString(), r));

    // 2. Fetch all teachers to compute real-time rollups from class_register_entries
    const teacherQuery: any = { role: "teacher", status: "active" };
    if (targetTeacherId) teacherQuery._id = targetTeacherId;

    const teachers = await User.find(teacherQuery).select("name email username subject phone").lean();

    // 3. For each teacher, get confirmed session count for this period
    const rollups = await Promise.all(
      teachers.map(async (t: any) => {
        const tId = t._id.toString();

        // Count completed sessions
        const completedSessionsCount = await ClassRegisterEntry.countDocuments({
          teacherId: t._id,
          sessionDate: { $regex: `^${period}` },
          status: "completed",
        });

        // Other session statuses count
        const otherSessionsCount = await ClassRegisterEntry.countDocuments({
          teacherId: t._id,
          sessionDate: { $regex: `^${period}` },
          status: { $ne: "completed" },
        });

        // Find active rate card
        const rateCard = await RateCard.findOne({
          teacherId: t._id,
          effectiveTo: null,
        }).lean();

        const ratePerSession = rateCard?.ratePerSession || 0;
        const grossPay = completedSessionsCount * ratePerSession;

        const savedRecord = recordMap.get(tId);

        return {
          teacher: t,
          period,
          completedSessions: completedSessionsCount,
          otherSessions: otherSessionsCount,
          ratePerSession,
          grossPay,
          hasRateCard: Boolean(rateCard),
          savedRecord: savedRecord || null,
          isFinalized: savedRecord?.status === "finalized",
        };
      })
    );

    return NextResponse.json({
      success: true,
      period,
      rollups,
    });
  } catch (error: any) {
    console.error("GET /api/payroll error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to fetch payroll" }, { status: 500 });
  }
}

// POST /api/payroll/finalize
// Finalizes payroll for a given period and teacher(s), locking the underlying class register entries
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if ("error" in authResult && authResult.error) return authResult.error;

    await connectDB();
    const body = await req.json();
    const { period, teacherId, adjustments = 0, adjustmentReason = "", action } = body;

    if (!period || !teacherId) {
      return NextResponse.json({ success: false, message: "period and teacherId are required" }, { status: 400 });
    }

    if (action === "reopen") {
      // Reopen a finalized payroll record
      const record = await PayrollRecord.findOne({ teacherId, periodMonth: period });
      if (record) {
        record.status = "draft";
        await record.save();
      }

      await ClassRegisterEntry.updateMany(
        { teacherId, sessionDate: { $regex: `^${period}` } },
        { $set: { payrollLocked: false } }
      );

      return NextResponse.json({ success: true, message: `Payroll reopened for ${period}` });
    }

    // Compute live values
    const completedSessions = await ClassRegisterEntry.countDocuments({
      teacherId,
      sessionDate: { $regex: `^${period}` },
      status: "completed",
    });

    const rateCard = await RateCard.findOne({ teacherId, effectiveTo: null }).lean();
    const rateApplied = rateCard?.ratePerSession || 0;
    const grossAmount = completedSessions * rateApplied;
    const netAmount = grossAmount + Number(adjustments);

    const record = await PayrollRecord.findOneAndUpdate(
      { teacherId, periodMonth: period },
      {
        totalSessions: completedSessions,
        rateApplied,
        grossAmount,
        adjustments: Number(adjustments),
        adjustmentReason,
        netAmount,
        status: "finalized",
        finalizedBy: new mongoose.Types.ObjectId(authResult.user.id),
        finalizedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Lock all class register entries for this teacher & month
    await ClassRegisterEntry.updateMany(
      { teacherId, sessionDate: { $regex: `^${period}` } },
      { $set: { payrollLocked: true } }
    );

    return NextResponse.json({
      success: true,
      message: `Payroll for ${period} successfully finalized and locked.`,
      record,
    });
  } catch (error: any) {
    console.error("POST /api/payroll/finalize error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to finalize payroll" }, { status: 500 });
  }
}
