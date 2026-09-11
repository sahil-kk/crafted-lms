import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Announcement } from "@/models/Announcement";

// GET all announcements (requires authenticated session)
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    await connectDB();
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    return NextResponse.json(announcements);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// POST create announcement (requires admin or teacher)
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { title, content, priority, date } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ message: "Title and content are required" }, { status: 400 });
    }

    const newAnnouncement = new Announcement({
      title,
      content,
      priority: priority || "medium",
      date: date || new Date().toISOString().split("T")[0],
    });

    await newAnnouncement.save();
    return NextResponse.json(newAnnouncement, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
