import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
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

    const user = await User.findOne({
      $or: [
        { username },
        { email: username?.toLowerCase() },
      ],
      role: "teacher",
    });
    if (!user) {
      return NextResponse.json({ msg: "Teacher not found" }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ msg: "Invalid credentials" }, { status: 400 });
    }

    const secret = getJwtSecret();
    const token = jwt.sign(
      { id: user._id, role: "teacher" },
      secret,
      { expiresIn: "7d" }
    );

    return NextResponse.json({ token, role: user.role });
  } catch (err: any) {
    console.error("Teacher login error:", err);
    return NextResponse.json({ msg: err.message || "Server error" }, { status: 500 });
  }
}

