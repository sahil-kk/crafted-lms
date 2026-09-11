import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireAuth, sanitizeUser } from "@/lib/auth";
import { Student } from "@/models/Student";

// GET all students (requires authenticated session)
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    await connectDB();
    const students = await Student.find().sort({ createdAt: -1 }).select("-password");
    return NextResponse.json(students);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// POST create student (requires admin)
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const body = await req.json();
    const { studentId, password, name, email, phone, course, status, batch, assignedCourses, classLink } = body;

    if (!password || !name || !email || !course) {
      return NextResponse.json({ message: "Please fill all required fields" }, { status: 400 });
    }

    const existingEmail = await Student.findOne({ email });
    if (existingEmail) {
      return NextResponse.json({ message: "Email already exists" }, { status: 400 });
    }

    let finalStudentId = studentId;

    if (!finalStudentId) {
      const prefixMap: Record<string, string> = {
        "8th": "C8",
        "9th": "C9",
        "10th": "C10",
        "11th": "C11",
        "12th": "C12",
      };
      const prefix = prefixMap[course] || "C10";

      const studentsInClass = await Student.find({
        studentId: new RegExp(`^${prefix}\\d+`),
      });

      let nextNum = 1;
      if (studentsInClass.length > 0) {
        const numbers = studentsInClass.map((s) => {
          const suffix = s.studentId.substring(prefix.length);
          const num = parseInt(suffix, 10);
          return isNaN(num) ? 0 : num;
        });
        const maxNum = Math.max(...numbers);
        nextNum = maxNum + 1;
      }

      const paddedNum = String(nextNum).padStart(2, "0");
      finalStudentId = `${prefix}${paddedNum}`;
    }

    const existingId = await Student.findOne({ studentId: finalStudentId });
    if (existingId) {
      return NextResponse.json({ message: "Student ID already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = new Student({
      studentId: finalStudentId,
      password: hashedPassword,
      name,
      email,
      phone,
      course,
      status: status || "active",
      batch: batch || "Batch 1",
      classLink: classLink || "",
      assignedCourses: assignedCourses || ["Physics", "Chemistry", "Biology", "Mathematics"],
    });

    await newStudent.save();
    return NextResponse.json(
      { message: "Student added successfully", student: sanitizeUser(newStudent) },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
