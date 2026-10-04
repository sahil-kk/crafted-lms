import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Result } from "@/models/Result";
import { getTeacherScope } from "@/lib/mentorSync";

// PUT update result (requires admin or teacher)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;

    const existingResult = await Result.findById(id);
    if (!existingResult) {
      return NextResponse.json({ message: "Result not found" }, { status: 404 });
    }

    let finalSubject: string | undefined = undefined;
    if (authResult.user.role === "teacher") {
      const scope = await getTeacherScope(authResult.user.id);
      if (existingResult.subject.toLowerCase() !== scope.subject.toLowerCase()) {
        return NextResponse.json({ message: "Access forbidden: cannot edit result for another subject" }, { status: 403 });
      }
      if (!scope.allStudentIdentifiers.includes(existingResult.studentId)) {
        return NextResponse.json({ message: "Access forbidden: student not assigned to you" }, { status: 403 });
      }
      finalSubject = scope.subject;
    }

    const { subject, examType, score, maxScore, grade, date, trend } = await req.json();

    const updated = await Result.findByIdAndUpdate(
      id,
      {
        ...((finalSubject || subject) && { subject: finalSubject || subject }),
        ...(examType && { examType }),
        ...(score !== undefined && { score }),
        ...(maxScore !== undefined && { maxScore }),
        ...(grade && { grade }),
        ...(date && { date }),
        ...(trend && { trend }),
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ message: "Result not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

export const PATCH = PUT;

// DELETE result (requires admin or teacher)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;

    const existingResult = await Result.findById(id);
    if (!existingResult) {
      return NextResponse.json({ message: "Result not found" }, { status: 404 });
    }

    if (authResult.user.role === "teacher") {
      const scope = await getTeacherScope(authResult.user.id);
      if (existingResult.subject.toLowerCase() !== scope.subject.toLowerCase()) {
        return NextResponse.json({ message: "Access forbidden: cannot delete result for another subject" }, { status: 403 });
      }
      if (!scope.allStudentIdentifiers.includes(existingResult.studentId)) {
        return NextResponse.json({ message: "Access forbidden: student not assigned to you" }, { status: 403 });
      }
    }

    await Result.findByIdAndDelete(id);
    return NextResponse.json({ message: "Result deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
