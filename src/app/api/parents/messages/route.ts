import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import { User } from "@/models/User";
import { ParentTeacherMessage } from "@/models/ParentTeacherMessage";

// GET messages
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const tokenUser = getUserFromToken(req);
    if (!tokenUser) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const query =
      tokenUser.role === "teacher"
        ? { teacher: tokenUser.id }
        : tokenUser.role === "parent"
        ? { parent: tokenUser.id }
        : {};

    const messages = await ParentTeacherMessage.find(query)
      .populate("parent", "name email phone relationship")
      .populate("student", "name studentId course batch")
      .populate("teacher", "name email subject")
      .sort({ createdAt: -1 });

    return NextResponse.json(messages);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to fetch messages" }, { status: 500 });
  }
}

// POST create message
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const tokenUser = getUserFromToken(req);
    const { teacherId, studentId, subject, message } = await req.json();

    if (!teacherId || !studentId || !subject || !message) {
      return NextResponse.json({ message: "Teacher, student, subject, and message are required" }, { status: 400 });
    }

    let parentId: string | undefined = tokenUser?.id;
    if (!parentId || tokenUser?.role !== "parent") {
      const parentUser = await User.findOne({ role: "parent", linkedStudentId: studentId });
      parentId = parentUser?._id ? parentUser._id.toString() : undefined;
    }

    if (!parentId) {
      return NextResponse.json({ message: "Parent account not linked to this student" }, { status: 400 });
    }

    const newMessage = new ParentTeacherMessage({
      parent: parentId,
      student: studentId,
      teacher: teacherId,
      subject,
      message,
      status: "sent",
    });

    const saved = await newMessage.save();
    await saved.populate("parent", "name email phone");
    await saved.populate("student", "name studentId course");
    await saved.populate("teacher", "name email subject");

    return NextResponse.json(saved, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to send message" }, { status: 500 });
  }
}
