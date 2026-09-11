import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Result } from "@/models/Result";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const deleted = await Result.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Result not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Result deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
