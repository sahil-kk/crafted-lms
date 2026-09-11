import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { User } from "@/models/User";
import { ParentActivityControl } from "@/models/ParentActivityControl";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const parent = await User.findOne({ _id: id, role: "parent" });
    if (!parent || !parent.linkedStudentId) {
      return NextResponse.json({ message: "Parent not linked to a student" }, { status: 404 });
    }

    const control = await ParentActivityControl.findOneAndUpdate(
      { parent: id, student: parent.linkedStudentId },
      {
        $set: {
          parent: id,
          student: parent.linkedStudentId,
          dailyStudyGoalMinutes: body.dailyStudyGoalMinutes ?? 90,
          maxPracticeTestsPerDay: body.maxPracticeTestsPerDay ?? 2,
          allowRecordedClasses: body.allowRecordedClasses ?? true,
          allowPracticeExams: body.allowPracticeExams ?? true,
          allowWeekendStudy: body.allowWeekendStudy ?? true,
          focusSubjects: body.focusSubjects || [],
          notes: body.notes || "",
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(control);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to save parent controls" }, { status: 500 });
  }
}
