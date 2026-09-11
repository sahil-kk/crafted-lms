import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { User } from "@/models/User";
import { Student } from "@/models/Student";
import { ParentActivityControl } from "@/models/ParentActivityControl";
import { ParentTeacherMessage } from "@/models/ParentTeacherMessage";

// PUT update parent (requires admin or the parent themselves)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    const { user } = authResult;
    const { id } = await params;

    // Only admin or the parent themselves can update their profile
    if (user.role !== "admin" && user.id !== id) {
      return NextResponse.json({ message: "Access forbidden: insufficient permissions" }, { status: 403 });
    }

    await connectDB();
    const { username, email, name, phone, studentId, relationship, status, password } = await req.json();

    const parent = await User.findOne({ _id: id, role: "parent" });
    if (!parent) {
      return NextResponse.json({ message: "Parent not found" }, { status: 404 });
    }

    if (username && username !== parent.username) {
      const existing = await User.findOne({ username, _id: { $ne: id } });
      if (existing) {
        return NextResponse.json({ message: "Username already taken" }, { status: 400 });
      }
      parent.username = username;
    }

    if (email && email !== parent.email) {
      const existing = await User.findOne({ email, _id: { $ne: id } });
      if (existing) {
        return NextResponse.json({ message: "Email already taken" }, { status: 400 });
      }
      parent.email = email;
    }

    // Only admin can change linked student
    if (studentId && user.role === "admin") {
      const student = await Student.findOne({
        $or: [{ _id: studentId }, { studentId }],
      });
      if (student) parent.linkedStudentId = student._id;
    }

    if (name) parent.name = name;
    if (phone !== undefined) parent.phone = phone;
    if (relationship) parent.relationship = relationship;
    if (status && user.role === "admin") parent.status = status;

    if (password && password.trim()) {
      parent.password = await bcrypt.hash(password, 10);
    }

    await parent.save();
    await parent.populate("linkedStudentId");

    return NextResponse.json({
      id: parent._id,
      _id: parent._id,
      username: parent.username,
      email: parent.email,
      name: parent.name,
      phone: parent.phone,
      relationship: parent.relationship,
      status: parent.status,
      student: parent.linkedStudentId,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

export const PATCH = PUT;

// DELETE parent (requires admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const deleted = await User.findOneAndDelete({ _id: id, role: "parent" });
    if (!deleted) {
      return NextResponse.json({ message: "Parent not found" }, { status: 404 });
    }

    await ParentActivityControl.deleteMany({ parent: id });
    await ParentTeacherMessage.deleteMany({ parent: id });

    return NextResponse.json({ message: "Parent deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
