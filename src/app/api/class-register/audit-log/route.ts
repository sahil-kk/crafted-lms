import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClassRegisterEntryEdit } from "@/models/ClassRegisterEntryEdit";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if ("error" in authResult && authResult.error) return authResult.error;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const entryId = searchParams.get("entryId");

    const query: any = {};
    if (entryId) query.entryId = entryId;

    const logs = await ClassRegisterEntryEdit.find(query)
      .populate("editedBy", "name email role")
      .populate("entryId")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error("GET /api/class-register/audit-log error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to fetch audit log" }, { status: 500 });
  }
}
