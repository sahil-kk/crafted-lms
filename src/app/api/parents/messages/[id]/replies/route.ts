import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ParentTeacherMessage } from "@/models/ParentTeacherMessage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["teacher", "admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ message: "Reply message is required" }, { status: 400 });
    }

    const thread = await ParentTeacherMessage.findById(id);
    if (!thread) {
      return NextResponse.json({ message: "Message thread not found" }, { status: 404 });
    }

    thread.status = "replied";
    thread.message = `${thread.message}\n\n[Teacher Reply - ${new Date().toLocaleDateString()}]: ${message}`;
    await thread.save();

    await thread.populate("parent", "name email phone");
    await thread.populate("student", "name studentId course");
    await thread.populate("teacher", "name email subject");

    return NextResponse.json(thread);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to send reply" }, { status: 500 });
  }
}
