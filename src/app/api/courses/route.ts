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

import { requireAuth } from "@/lib/auth";
import { serverCache } from "@/lib/cache";

// GET all courses
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    const cached = serverCache.get<any[]>("courses_all");
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "X-Cache": "HIT", "Cache-Control": "private, no-cache, must-revalidate" },
      });
    }

    await connectDB();
    await seedCoursesIfNeeded();
    const courses = await Course.find().sort({ classGrade: 1, subject: 1 }).lean();
    serverCache.set("courses_all", courses, 60, ["courses", "bootstrap"]);
    return NextResponse.json(courses, {
      headers: { "X-Cache": "MISS", "Cache-Control": "private, no-cache, must-revalidate" },
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
    const { classGrade, subject } = await req.json();

    if (!classGrade || !subject) {
      return NextResponse.json({ message: "Class/Grade and Subject are required" }, { status: 400 });
    }

    const existing = await Course.findOne({ classGrade, subject });
    if (existing) {
      return NextResponse.json({ message: "Course combination already exists", course: existing }, { status: 200 });
    }

    const newCourse = new Course({
      classGrade,
      subject,
      chapters: [],
    });

    await newCourse.save();
    serverCache.invalidateTags(["courses", "bootstrap"]);
    return NextResponse.json(newCourse, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
