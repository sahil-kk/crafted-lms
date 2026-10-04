import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireAuth, sanitizeUser } from "@/lib/auth";
import { User } from "@/models/User";
import { RateCard } from "@/models/RateCard";
import { syncMentorAssignments, assignMentorToStudent } from "@/lib/mentorSync";

// GET all teachers (requires authenticated session)
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    await connectDB();
    await syncMentorAssignments();
    const teachers = await User.find({ role: "teacher" }).select("-password").sort({ createdAt: -1 }).lean();
    const activeRateCards = await RateCard.find({ effectiveTo: null }).lean();
    const rateMap = new Map(activeRateCards.map((rc: any) => [rc.teacherId.toString(), rc.ratePerSession]));
    const teachersWithRates = teachers.map((t: any) => ({
      ...t,
      ratePerSession: rateMap.get(t._id.toString()) ?? null,
    }));

    return NextResponse.json(teachersWithRates);
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
    const { password, name, email, phone, subject, status, assignedStudents, ratePerSession } = body;
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
      assignedStudents: [],
      role: "teacher",
      status: status || "active",
    });

    await newTeacher.save();

    if (Array.isArray(assignedStudents) && assignedStudents.length > 0) {
      for (const stId of assignedStudents) {
        await assignMentorToStudent(stId, newTeacher._id, newTeacher.subject || "Physics");
      }
      // Re-fetch to get updated assignedStudents list
      const refreshed = await User.findById(newTeacher._id);
      if (refreshed) {
        newTeacher.assignedStudents = refreshed.assignedStudents;
      }
    }

    let createdRateCard = null;
    if (ratePerSession !== undefined && ratePerSession !== null && ratePerSession !== "" && Number(ratePerSession) >= 0) {
      createdRateCard = await RateCard.create({
        teacherId: newTeacher._id,
        ratePerSession: Number(ratePerSession),
        effectiveFrom: new Date(),
        effectiveTo: null,
      });
    }

    const sanitized = sanitizeUser(newTeacher);
    return NextResponse.json(
      {
        message: "Teacher added successfully",
        teacher: { ...sanitized, ratePerSession: createdRateCard?.ratePerSession ?? null },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
