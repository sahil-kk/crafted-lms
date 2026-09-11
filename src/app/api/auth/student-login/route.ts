import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import { Student } from "@/models/Student";
import { getJwtSecret, escapeRegex } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    // Rate Limiting (max 8 attempts per minute per IP)
    const rateLimit = checkRateLimit(req, 8, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { msg: `Too many login attempts. Please try again in ${rateLimit.resetInSeconds} seconds.` },
        { status: 429 }
      );
    }

    await connectDB();
    const { studentId, password } = await req.json();
    const trimmedId = studentId?.trim() || "";
    const student = await Student.findOne({
      $or: [
        { studentId: trimmedId },
        { studentId: new RegExp(`^${escapeRegex(trimmedId)}$`, "i") },
        { email: trimmedId.toLowerCase() },
      ],
    });
    if (!student) {
      return NextResponse.json({ msg: "Student not found" }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return NextResponse.json({ msg: "Invalid credentials" }, { status: 400 });
    }

    const secret = getJwtSecret();
    const token = jwt.sign(
      { id: student._id, role: "student" },
      secret,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      token,
      role: "student",
      student: {
        id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        course: student.course,
        status: student.status,
        classLink: student.classLink || "",
      },
    });
  } catch (err: any) {
    console.error("Student login error:", err);
    return NextResponse.json({ msg: err.message || "Server error" }, { status: 500 });
  }
}

