import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Course } from "@/models/Course";
import { uploadToR2 } from "@/lib/r2";

// POST /api/courses/[id]/chapters/[chapterId]/upload
// Uploads a note or assignment PDF to Cloudflare R2 and adds it to the chapter
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id, chapterId } = await params;

    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
    if (!chapter) {
      return NextResponse.json({ message: "Chapter not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "";
    const type = (formData.get("type") as string) || "note"; // "note" | "assignment"

    if (!file || !title.trim()) {
      return NextResponse.json({ message: "Title and file are required" }, { status: 400 });
    }

    // Upload to R2 (or fallback base64) in the 'materials' folder
    const fileUrl = await uploadToR2(file, "materials");

    const materialItem = {
      title: title.trim(),
      fileUrl,
      createdAt: new Date(),
    };

    if (type === "assignment") {
      chapter.assignments.push(materialItem);
    } else {
      chapter.notes.push(materialItem);
    }

    await course.save();

    return NextResponse.json(
      {
        message: `${type === "assignment" ? "Assignment" : "Note"} uploaded successfully`,
        course,
        item: materialItem,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Material upload error:", err);
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
