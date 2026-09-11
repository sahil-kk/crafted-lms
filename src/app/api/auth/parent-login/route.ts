import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Student } from "@/models/Student";
import { getJwtSecret } from "@/lib/auth";
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
    const { username, password } = await req.json();

    let parent = await User.findOne({
      $or: [{ username }, { email: username }],
      role: "parent",
      status: "active",
    }).populate("linkedStudentId");

    if (!parent) {
      const linkedStudent = await Student.findOne({
        $or: [{ studentId: username }, { email: username }],
      });

      if (linkedStudent) {
        parent = await User.findOne({
          role: "parent",
          status: "active",
          linkedStudentId: linkedStudent._id,
        }).populate("linkedStudentId");
      }
    }

    if (!parent) {
      return NextResponse.json({ msg: "Parent account not found" }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(password, parent.password);
    if (!isMatch) {
      return NextResponse.json({ msg: "Invalid credentials" }, { status: 400 });
    }

    const linkedStudent = parent.linkedStudentId as any;
    const secret = getJwtSecret();
    const token = jwt.sign(
      { id: parent._id, role: "parent", studentId: linkedStudent?._id },
      secret,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      token,
      role: "parent",
      parent: {
        id: parent._id,
        username: parent.username,
        name: parent.name,
        email: parent.email,
        phone: parent.phone,
        linkedStudentId: linkedStudent?._id,
        relationship: parent.relationship,
      },
      student: linkedStudent
        ? {
            id: linkedStudent._id,
            studentId: linkedStudent.studentId,
            name: linkedStudent.name,
            email: linkedStudent.email,
            course: linkedStudent.course,
            batch: linkedStudent.batch,
            status: linkedStudent.status,
          }
        : null,
    });
  } catch (err: any) {
    console.error("Parent login error:", err);
    return NextResponse.json({ msg: err.message || "Server error" }, { status: 500 });
  }
}
