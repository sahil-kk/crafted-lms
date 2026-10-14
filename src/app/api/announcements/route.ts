import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Announcement } from "@/models/Announcement";
import { Student } from "@/models/Student";
import { User } from "@/models/User";
import { getTeacherScope } from "@/lib/mentorSync";
import { serverCache } from "@/lib/cache";

// GET announcements scoped by user role and identity
export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    const { user } = authResult;
    await connectDB();

    let query: any = {};

    if (user.role === "admin") {
      query = {}; // Admin sees all
    } else if (user.role === "student") {
      const studentIds: string[] = [user.id, user.studentId].filter((id): id is string => Boolean(id));
      try {
        const studentDoc = await Student.findOne({
          $or: [{ _id: user.id }, { studentId: user.studentId || user.id }],
        }).lean();
        if (studentDoc) {
          if (studentDoc._id) studentIds.push(studentDoc._id.toString());
          if (studentDoc.studentId) studentIds.push(studentDoc.studentId);
        }
      } catch {}
      const uniqueStudentIds = Array.from(new Set(studentIds));

      query = {
        $or: [
          { is_global: true, studentId: null, studentIds: { $size: 0 } },
          { is_global: true, studentId: { $in: [null, ""] } },
          { is_global: { $ne: false }, studentId: null, studentIds: { $size: 0 } },
          { is_global: { $ne: false }, studentId: { $in: [null, ""] } },
          { studentId: { $in: uniqueStudentIds } },
          { studentIds: { $in: uniqueStudentIds } },
        ],
      };
    } else if (user.role === "parent") {
      const studentIds: string[] = [];
      if (user.studentId) studentIds.push(String(user.studentId));
      try {
        const parentUser = await User.findById(user.id);
        if (parentUser?.linkedStudentId) {
          studentIds.push(parentUser.linkedStudentId.toString());
          const linkedStudent = await Student.findById(parentUser.linkedStudentId);
          if (linkedStudent) {
            if (linkedStudent.studentId) studentIds.push(linkedStudent.studentId);
            if (linkedStudent._id) studentIds.push(linkedStudent._id.toString());
          }
        }
      } catch {}
      const uniqueStudentIds = Array.from(new Set(studentIds));

      query = {
        $or: [
          { is_global: true, studentId: null, studentIds: { $size: 0 } },
          { is_global: true, studentId: { $in: [null, ""] } },
          { is_global: { $ne: false }, studentId: null, studentIds: { $size: 0 } },
          { is_global: { $ne: false }, studentId: { $in: [null, ""] } },
          { studentId: { $in: uniqueStudentIds } },
          { studentIds: { $in: uniqueStudentIds } },
        ],
      };
    } else if (user.role === "teacher") {
      const scope = await getTeacherScope(user.id);
      query = {
        $or: [
          { is_global: true, studentId: null, studentIds: { $size: 0 } },
          { is_global: true, studentId: { $in: [null, ""] } },
          { is_global: { $ne: false }, studentId: null, studentIds: { $size: 0 } },
          { is_global: { $ne: false }, studentId: { $in: [null, ""] } },
          { authorId: user.id },
          ...(scope.allStudentIdentifiers.length > 0
            ? [
                { studentId: { $in: scope.allStudentIdentifiers } },
                { studentIds: { $in: scope.allStudentIdentifiers } },
              ]
            : []),
        ],
      };
    }

    const announcements = await Announcement.find(query).sort({ createdAt: -1 });
    return NextResponse.json(announcements);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// POST create announcement (requires admin or teacher)
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const body = await req.json();
    const { title, content, priority, date, studentId, studentIds, category, is_global } = body;
    const finalContent = content || body.body;

    if (!title || !finalContent) {
      return NextResponse.json({ message: "Title and content are required" }, { status: 400 });
    }

    const isGlobal = is_global !== undefined
      ? Boolean(is_global)
      : (authResult.user.role === "admin" && !studentId);

    const newAnnouncement = new Announcement({
      title,
      content: finalContent,
      priority: priority || "medium",
      date: date || new Date().toISOString().split("T")[0],
      is_global: isGlobal,
      studentId: studentId || null,
      studentIds: Array.isArray(studentIds) ? studentIds : [],
      category: category || "general",
      authorRole: authResult.user.role,
      authorId: authResult.user.id,
    });

    await newAnnouncement.save();
    serverCache.invalidateTags(["bootstrap"]);
    serverCache.clear();
    return NextResponse.json(newAnnouncement, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
