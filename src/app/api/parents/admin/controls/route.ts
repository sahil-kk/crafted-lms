import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { User } from "@/models/User";
import { ParentActivityControl } from "@/models/ParentActivityControl";

export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const [parents, controls] = await Promise.all([
      User.find({ role: "parent" })
        .populate("linkedStudentId", "name studentId course batch status")
        .select("-password")
        .sort({ createdAt: -1 }),
      ParentActivityControl.find()
        .populate("parent", "name email phone")
        .populate("student", "name studentId course batch"),
    ]);

    return NextResponse.json({
      parents: parents.map((p: any) => ({
        id: p._id,
        _id: p._id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        relationship: p.relationship,
        status: p.status,
        student: p.linkedStudentId,
      })),
      controls,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to fetch parent controls" }, { status: 500 });
  }
}
