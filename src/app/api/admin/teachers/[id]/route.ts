import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAuth, sanitizeUser } from "@/lib/auth";
import { User } from "@/models/User";
import { Student } from "@/models/Student";
import { RateCard } from "@/models/RateCard";
import { assignMentorToStudent, unassignMentorFromStudent } from "@/lib/mentorSync";

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
    const { username, password, name, email, phone, subject, status, assignedStudents, ratePerSession } = await req.json();

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

    const teacherSubject = (subject || teacher.subject || "Physics").trim();

    if (subject && subject !== teacher.subject) {
      await Student.updateMany(
        { "mentorAssignments.teacherId": teacher._id },
        { $set: { "mentorAssignments.$[elem].subject": teacherSubject } },
        { arrayFilters: [{ "elem.teacherId": teacher._id }] }
      );
      teacher.subject = teacherSubject;
    }

    if (assignedStudents !== undefined && user.role === "admin") {
      const currentAssigned = (teacher.assignedStudents || []).map((s: any) => s.toString());
      const newAssigned = (Array.isArray(assignedStudents) ? assignedStudents : []).map((s: any) => s.toString());

      const added = newAssigned.filter((sId: string) => !currentAssigned.includes(sId));
      const removed = currentAssigned.filter((sId: string) => !newAssigned.includes(sId));

      for (const sId of added) {
        await assignMentorToStudent(sId, teacher._id, teacherSubject);
      }
      for (const sId of removed) {
        await unassignMentorFromStudent(sId, teacher._id, teacherSubject);
      }

      teacher.assignedStudents = newAssigned.map((sId: string) => new mongoose.Types.ObjectId(sId));
    }
    // Only admin can change status
    if (status && user.role === "admin") teacher.status = status;

    if (password && password.trim()) {
      teacher.password = await bcrypt.hash(password, 10);
    }

    await teacher.save();

    let updatedRate: number | null = null;
    if (ratePerSession !== undefined && ratePerSession !== null && ratePerSession !== "" && user.role === "admin") {
      const numRate = Number(ratePerSession);
      if (numRate >= 0) {
        const currentCard = await RateCard.findOne({ teacherId: id, effectiveTo: null });
        if (!currentCard || currentCard.ratePerSession !== numRate) {
          if (currentCard) {
            currentCard.effectiveTo = new Date();
            await currentCard.save();
          }
          await RateCard.create({
            teacherId: new mongoose.Types.ObjectId(id),
            ratePerSession: numRate,
            effectiveFrom: new Date(),
            effectiveTo: null,
          });
        }
        updatedRate = numRate;
      }
    } else {
      const activeCard = await RateCard.findOne({ teacherId: id, effectiveTo: null }).lean();
      updatedRate = activeCard?.ratePerSession ?? null;
    }

    return NextResponse.json({
      message: "Teacher updated successfully",
      teacher: { ...sanitizeUser(teacher), ratePerSession: updatedRate },
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

    await Student.updateMany(
      { "mentorAssignments.teacherId": new mongoose.Types.ObjectId(id) },
      { $pull: { mentorAssignments: { teacherId: new mongoose.Types.ObjectId(id) } } }
    );

    return NextResponse.json({ message: "Teacher deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
