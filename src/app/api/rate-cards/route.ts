import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { RateCard } from "@/models/RateCard";
import { requireAuth } from "@/lib/auth";
import mongoose from "mongoose";

// GET /api/rate-cards?teacherId=
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if ("error" in authResult && authResult.error) return authResult.error;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId");

    const query: any = {};
    if (authResult.user.role === "teacher") {
      query.teacherId = authResult.user.id;
    } else if (teacherId) {
      query.teacherId = teacherId;
    }

    const rateCards = await RateCard.find(query)
      .populate("teacherId", "name email username subject")
      .sort({ effectiveFrom: -1 })
      .lean();

    return NextResponse.json({ success: true, rateCards });
  } catch (error: any) {
    console.error("GET /api/rate-cards error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to fetch rate cards" }, { status: 500 });
  }
}

// POST /api/rate-cards
// Admin can set or update rate card for a teacher
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if ("error" in authResult && authResult.error) return authResult.error;

    await connectDB();
    const body = await req.json();
    const { teacherId, ratePerSession, effectiveFrom } = body;

    if (!teacherId || ratePerSession === undefined) {
      return NextResponse.json(
        { success: false, message: "teacherId and ratePerSession are required" },
        { status: 400 }
      );
    }

    const fromDate = effectiveFrom ? new Date(effectiveFrom) : new Date();

    // Expire previous active rate card
    await RateCard.updateMany(
      { teacherId: new mongoose.Types.ObjectId(teacherId), effectiveTo: null },
      { $set: { effectiveTo: fromDate } }
    );

    // Create new rate card
    const card = await RateCard.create({
      teacherId: new mongoose.Types.ObjectId(teacherId),
      ratePerSession: Number(ratePerSession),
      effectiveFrom: fromDate,
      effectiveTo: null,
    });

    const populated = await RateCard.findById(card._id).populate("teacherId", "name email username subject").lean();

    return NextResponse.json({ success: true, rateCard: populated }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/rate-cards error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to set rate card" }, { status: 500 });
  }
}
