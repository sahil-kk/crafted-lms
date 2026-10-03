import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireAuth, sanitizeUser } from "@/lib/auth";
import { User } from "@/models/User";

// PUT update teacher (requires admin or the teacher themselves)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    const { user } = authResult;
    const { id } = await params;

    // Only admin or the teacher themselves can update their profile
    if (user.role !== "admin" && user.id !== id) {
      return NextResponse.json({ message: "Access forbidden: insufficient permissions" }, { status: 403 });
    }

    await connectDB();
    const { username, password, name, email, phone, subject, status, assignedStudents } = await req.json();

    const teacher = await User.findById(id);
    if (!teacher) {
      return NextResponse.json({ message: "Teacher not found" }, { status: 404 });
    }

    if (username && username !== teacher.username) {
      const existing = await User.findOne({ username, _id: { $ne: id } });
      if (existing) {
        return NextResponse.json({ message: "Username already taken" }, { status: 400 });
      }
      teacher.username = username;
    }

    if (name) teacher.name = name;
    if (email !== undefined) teacher.email = email;
    if (phone !== undefined) teacher.phone = phone;
    if (subject) teacher.subject = subject;
    if (assignedStudents !== undefined && user.role === "admin") {
      teacher.assignedStudents = Array.isArray(assignedStudents) ? assignedStudents : [];
    }
    // Only admin can change status
    if (status && user.role === "admin") teacher.status = status;

    if (password && password.trim()) {
      teacher.password = await bcrypt.hash(password, 10);
    }

    await teacher.save();
    return NextResponse.json({
      message: "Teacher updated successfully",
      teacher: sanitizeUser(teacher),
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

export const PATCH = PUT;

// DELETE teacher (requires admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const teacher = await User.findByIdAndDelete(id);
    if (!teacher) {
      return NextResponse.json({ message: "Teacher not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Teacher deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
