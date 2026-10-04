import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Course } from "@/models/Course";

let hasCheckedSeed = false;

const seedCoursesIfNeeded = async () => {
  if (hasCheckedSeed) return;
  const count = await Course.countDocuments();
  if (count >= 20) {
    hasCheckedSeed = true;
    return;
  }

  const existingCourses = await Course.find({}, "classGrade subject");
  const existingSet = new Set(existingCourses.map((c) => `${c.classGrade}_${c.subject}`));

  const classes = ["8th", "9th", "10th", "11th", "12th"];
  const subjects = ["Physics", "Chemistry", "Biology", "Mathematics"];
  const toInsert = [];

  for (const classGrade of classes) {
    for (const subject of subjects) {
      if (!existingSet.has(`${classGrade}_${subject}`)) {
        toInsert.push({
          classGrade,
          subject,
          chapters: [],
        });
      }
    }
  }

  if (toInsert.length > 0) {
    await Course.insertMany(toInsert);
  }
  hasCheckedSeed = true;
};

import mongoose from "mongoose";
import { requireAuth, escapeRegex } from "@/lib/auth";
import { serverCache } from "@/lib/cache";
import { getTeacherScope } from "@/lib/mentorSync";
import { Student } from "@/models/Student";

// GET courses (scoped by role, subject, and student)
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    const { user } = authResult;
    const { searchParams } = new URL(req.url);
    const paramStudentId = searchParams.get("studentId");
    const paramClassGrade = searchParams.get("classGrade");
    const paramSubject = searchParams.get("subject");

    await connectDB();
    await seedCoursesIfNeeded();

    let query: any = {};

    if (paramClassGrade) query.classGrade = paramClassGrade;
    if (paramSubject) query.subject = { $regex: new RegExp(`^${escapeRegex(paramSubject)}$`, "i") };

    if (user.role === "teacher") {
      const scope = await getTeacherScope(user.id);
      query.subject = { $regex: new RegExp(`^${escapeRegex(scope.subject)}$`, "i") };

      if (paramStudentId) {
        if (!scope.allStudentIdentifiers.includes(paramStudentId)) {
          return NextResponse.json(
            { message: "Access forbidden: student not assigned to you" },
            { status: 403 }
          );
        }
        query.studentId = new mongoose.Types.ObjectId(paramStudentId);
      } else {
        query.$or = [
          { studentId: null },
          { studentId: { $in: scope.assignedStudentObjectIds } },
        ];
      }
    } else if (user.role === "student") {
      const studentIds = [user.id, user.studentId].filter((id): id is string => Boolean(id));
      const studentDoc = await Student.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(user.id) ? [{ _id: new mongoose.Types.ObjectId(user.id) }] : []),
          ...(user.studentId ? [{ studentId: user.studentId }] : []),
        ],
      });

      const studentObjId = studentDoc?._id || (mongoose.Types.ObjectId.isValid(user.id) ? new mongoose.Types.ObjectId(user.id) : null);

      query.$or = [
        { studentId: null },
        ...(studentObjId ? [{ studentId: studentObjId }] : []),
      ];
    } else if (user.role === "admin") {
      if (paramStudentId) {
        query.studentId = paramStudentId === "null" || paramStudentId === "general" ? null : new mongoose.Types.ObjectId(paramStudentId);
      }
    }

    const courses = await Course.find(query).sort({ classGrade: 1, subject: 1 }).lean();
    return NextResponse.json(courses, {
      headers: { "Cache-Control": "private, no-cache, must-revalidate" },
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// POST create course (requires admin or teacher)
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const body = await req.json();
    let { classGrade, subject, studentId } = body;

    if (!classGrade || !subject) {
      return NextResponse.json({ message: "Class/Grade and Subject are required" }, { status: 400 });
    }

    if (authResult.user.role === "teacher") {
      const scope = await getTeacherScope(authResult.user.id);
      subject = scope.subject || "Physics";
      if (studentId && !scope.allStudentIdentifiers.includes(studentId)) {
        return NextResponse.json(
          { message: "Access forbidden: cannot create materials for unassigned students" },
          { status: 403 }
        );
      }
    }

    const studentObjId = studentId && studentId !== "general" && studentId !== "null"
      ? new mongoose.Types.ObjectId(studentId)
      : null;

    const existing = await Course.findOne({
      classGrade,
      subject: { $regex: new RegExp(`^${escapeRegex(subject)}$`, "i") },
      studentId: studentObjId,
    });

    if (existing) {
      return NextResponse.json({ message: "Course already exists", course: existing }, { status: 200 });
    }

    const newCourse = new Course({
      classGrade,
      subject,
      studentId: studentObjId,
      chapters: [],
    });

    await newCourse.save();
    serverCache.invalidateTags(["courses", "bootstrap"]);
    return NextResponse.json(newCourse, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
