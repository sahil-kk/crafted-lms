import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Exam } from "@/models/Exam";

// GET single exam
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const exam = await Exam.findById(id);
    if (!exam) {
      return NextResponse.json({ message: "Exam not found" }, { status: 404 });
    }
    return NextResponse.json(exam);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// PUT update exam (requires admin or teacher)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const contentType = req.headers.get("content-type") || "";

    let updateData: any = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      if (formData.has("title")) updateData.title = formData.get("title") as string;
      if (formData.has("subject")) updateData.subject = formData.get("subject") as string;
      if (formData.has("date")) updateData.date = formData.get("date") as string;
      if (formData.has("studentId")) {
        const sid = formData.get("studentId") as string;
        updateData.studentId = sid === "none" || sid === "" ? null : sid;
      }
      if (formData.has("exam_type")) updateData.exam_type = formData.get("exam_type") as string;
      if (formData.has("starts_at")) updateData.starts_at = formData.get("starts_at") as string;
      if (formData.has("duration_minutes")) updateData.duration_minutes = Number(formData.get("duration_minutes"));

      const file = formData.get("pdf") as File | null;
      if (file && typeof file === "object" && file.size > 0) {
        const { uploadToR2 } = await import("@/lib/r2");
        updateData.pdf = await uploadToR2(file, "exams");
      }
    } else {
      const body = await req.json();
      if (body.title !== undefined) updateData.title = body.title;
      if (body.subject !== undefined) updateData.subject = body.subject;
      if (body.description !== undefined && body.subject === undefined) updateData.subject = body.description;
      if (body.date !== undefined) updateData.date = body.date;
      if (body.studentId !== undefined) {
        updateData.studentId = body.studentId === "none" || body.studentId === "" ? null : body.studentId;
      }
      if (body.pdf !== undefined) updateData.pdf = body.pdf;
      if (body.exam_type !== undefined) updateData.exam_type = body.exam_type;
      if (body.starts_at !== undefined) updateData.starts_at = body.starts_at;
      if (body.duration_minutes !== undefined) updateData.duration_minutes = Number(body.duration_minutes);
      if (body.questions !== undefined) updateData.questions = body.questions;
    }

    const updated = await Exam.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ message: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Exam updated successfully", exam: updated });
  } catch (err: any) {
    console.error("Error updating exam:", err);
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

export const PATCH = PUT;

// DELETE exam (requires admin or teacher)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const deleted = await Exam.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Exam not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Exam deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
