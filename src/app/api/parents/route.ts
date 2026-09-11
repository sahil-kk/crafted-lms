import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Student } from "@/models/Student";

const findStudent = async (studentId: string) => {
  if (!studentId) return null;
  const studentQuery = mongoose.isValidObjectId(studentId)
    ? { $or: [{ _id: studentId }, { studentId }] }
    : { studentId };
  return Student.findOne(studentQuery);
};

const normalizeParent = (parent: any) => ({
  id: parent._id,
  _id: parent._id,
  username: parent.username,
  email: parent.email,
  name: parent.name,
  phone: parent.phone,
  relationship: parent.relationship || "Parent",
  status: parent.status || "active",
  student: parent.linkedStudentId,
  createdAt: parent.createdAt,
});

import { requireAuth } from "@/lib/auth";

// GET all parents (requires authenticated session)
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    await connectDB();
    const parents = await User.find({ role: "parent" })
      .populate("linkedStudentId")
      .sort({ createdAt: -1 })
      .select("-password");
    return NextResponse.json(parents.map(normalizeParent));
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to fetch parents" }, { status: 500 });
  }
}

// POST create parent (requires admin)
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { username, email, password, name, phone, studentId, relationship } = await req.json();

    if (!email || !password || !name || !studentId) {
      return NextResponse.json({ message: "Please fill all required fields" }, { status: 400 });
    }

    const student = await findStudent(studentId);
    if (!student) {
      return NextResponse.json({ message: "Linked student not found" }, { status: 404 });
    }

    const parentUsername = username || email;
    const existing = await User.findOne({
      role: "parent",
      $or: [{ username: parentUsername }, { email }],
    });
    if (existing) {
      return NextResponse.json({ message: "Parent username or email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const parent = new User({
      username: parentUsername,
      email,
      name,
      password: hashedPassword,
      role: "parent",
      phone: phone || "",
      linkedStudentId: student._id,
      relationship: relationship || "Parent",
      status: "active",
    });

    const saved = await parent.save();
    await saved.populate("linkedStudentId");
    return NextResponse.json(normalizeParent(saved), { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to create parent" }, { status: 500 });
  }
}
