import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Exam } from "@/models/Exam";
import { uploadToR2 } from "@/lib/r2";

// GET all exams
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    await connectDB();
    const exams = await Exam.find().sort({ createdAt: -1 });
    return NextResponse.json(exams);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// POST create exam (requires admin or teacher)
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();

    const contentType = req.headers.get("content-type") || "";
    let title = "";
    let subject = "";
    let date = "";
    let studentId: string | null = null;
    let pdf = "";
    let exam_type = "unit_test";
    let starts_at: string | null = null;
    let duration_minutes = 60;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      title = (formData.get("title") as string) || "";
      subject = (formData.get("subject") as string) || (formData.get("description") as string) || "General";
      date = (formData.get("date") as string) || (formData.get("starts_at") as string) || new Date().toISOString();
      studentId = (formData.get("studentId") as string) || null;
      if (studentId === "none" || studentId === "") studentId = null;
      exam_type = (formData.get("exam_type") as string) || "unit_test";
      starts_at = (formData.get("starts_at") as string) || null;
      const dur = formData.get("duration_minutes");
      if (dur) duration_minutes = Number(dur);

      const file = formData.get("pdf") as File | null;
      if (file && typeof file === "object" && file.size > 0) {
        try {
          pdf = await uploadToR2(file, "exams");
        } catch (uploadErr) {
          console.error("Failed to upload exam PDF to R2:", uploadErr);
        }
      }
    } else {
      const body = await req.json();
      title = body.title || "";
      subject = body.subject || body.description || "General";
      date = body.date || body.starts_at || new Date().toISOString().split("T")[0];
      studentId = body.studentId || null;
      if (studentId === "none" || studentId === "") studentId = null;
      pdf = body.pdf || "";
      exam_type = body.exam_type || "unit_test";
      starts_at = body.starts_at || null;
      duration_minutes = body.duration_minutes ? Number(body.duration_minutes) : 60;
    }

    if (!title) {
      return NextResponse.json({ message: "Exam title is required" }, { status: 400 });
    }

    const newExam = new Exam({
      subject: subject || "General",
      title: title.trim(),
      date,
      studentId,
      pdf,
      exam_type,
      starts_at,
      duration_minutes,
      questions: [],
    });

    await newExam.save();
    return NextResponse.json({ message: "Exam created successfully", exam: newExam }, { status: 201 });
  } catch (err: any) {
    console.error("Exam creation error:", err);
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

