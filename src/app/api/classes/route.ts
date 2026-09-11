import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { RecordedClass } from "@/models/RecordedClass";

// GET all recorded classes (requires authenticated session)
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    await connectDB();
    const classes = await RecordedClass.find().populate("course_id").sort({ createdAt: -1 });
    return NextResponse.json(classes);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// POST create recorded class (requires admin or teacher)
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { title, description, youtube_id, course_id } = await req.json();

    if (!title || !youtube_id) {
      return NextResponse.json({ message: "Title and YouTube ID are required" }, { status: 400 });
    }

    const newClass = new RecordedClass({
      title,
      description: description || "",
      youtube_id,
      course_id: course_id || null,
    });

    await newClass.save();
    return NextResponse.json(newClass, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
