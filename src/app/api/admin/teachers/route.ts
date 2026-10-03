import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireAuth, sanitizeUser } from "@/lib/auth";
import { User } from "@/models/User";

// GET all teachers (requires authenticated session)
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    await connectDB();
    const teachers = await User.find({ role: "teacher" }).select("-password").sort({ createdAt: -1 });
    return NextResponse.json(teachers);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// POST create teacher (requires admin)
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const body = await req.json();
    const { password, name, email, phone, subject, status } = body;
    let username = body.username || email || name?.toLowerCase().replace(/\s+/g, "");

    if (!username || !password || !name) {
      return NextResponse.json({ message: "Please provide username, password, and name" }, { status: 400 });
    }

    const existing = await User.findOne({
      $or: [
        { username },
        ...(email ? [{ email: email.toLowerCase() }] : []),
      ],
    });
    if (existing) {
      return NextResponse.json({ message: "A teacher with this username or email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newTeacher = new User({
      username,
      password: hashedPassword,
      name,
      email,
      phone,
      subject: subject || "Physics",
      role: "teacher",
      status: status || "active",
    });

    await newTeacher.save();
    return NextResponse.json(
      { message: "Teacher added successfully", teacher: sanitizeUser(newTeacher) },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
