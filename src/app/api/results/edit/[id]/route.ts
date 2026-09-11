import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Result } from "@/models/Result";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const { subject, examType, score, maxScore, grade, date, trend } = await req.json();

    const updated = await Result.findByIdAndUpdate(
      id,
      {
        ...(subject && { subject }),
        ...(examType && { examType }),
        ...(score !== undefined && { score }),
        ...(maxScore !== undefined && { maxScore }),
        ...(grade && { grade }),
        ...(date && { date }),
        ...(trend && { trend }),
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ message: "Result not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

export const PATCH = PUT;
