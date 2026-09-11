import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Course } from "@/models/Course";

export async function GET() {
  try {
    await connectDB();
    const courses = await Course.find();
    return NextResponse.json(courses);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
