import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Student } from "@/models/Student";
import { uploadToR2 } from "@/lib/r2";

// POST /api/students/[id]/profile-photo
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    const { user } = authResult;
    const { id } = await params;

    await connectDB();

    const existingStudent = await Student.findById(id);
    if (!existingStudent) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    const isOwner = user.id === id || user.studentId === existingStudent.studentId;
    if (user.role !== "admin" && !isOwner) {
      return NextResponse.json({ message: "Access forbidden: insufficient permissions" }, { status: 403 });
    }

    const formData = await req.formData();
    const photo = formData.get("photo") as File | null;

    if (!photo) {
      return NextResponse.json({ message: "No photo provided" }, { status: 400 });
    }

    if (!photo.type.startsWith("image/")) {
      return NextResponse.json({ message: "File must be an image" }, { status: 400 });
    }

    if (photo.size > 2 * 1024 * 1024) {
      return NextResponse.json({ message: "Image must be under 2 MB" }, { status: 400 });
    }

    // Upload directly to Cloudflare R2 bucket
    const photoUrl = await uploadToR2(photo, "avatars");

    const student = await Student.findByIdAndUpdate(
      id,
      { profilePhoto: photoUrl },
      { new: true }
    ).select("-password");

    return NextResponse.json({
      message: "Profile photo updated",
      profilePhoto: photoUrl,
    });
  } catch (err: any) {
    console.error("Profile photo upload error:", err);
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
