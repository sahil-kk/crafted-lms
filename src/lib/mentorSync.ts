import mongoose from "mongoose";
import { User, IUser } from "@/models/User";
import { Student, IStudent, IMentorAssignment } from "@/models/Student";
import { connectDB } from "./db";

let hasAutoMigrated = false;

/**
 * Automatically migrates and synchronizes existing teachers and students:
 * 1. Takes existing teacher.subject and teacher.assignedStudents, and populates
 *    student.mentorAssignments so students have explicit { subject, teacherId }.
 * 2. Enforces one-to-one mentor per subject per student.
 * 3. Enforces that teacher.assignedStudents accurately reflects student.mentorAssignments.
 */
export async function syncMentorAssignments(force: boolean = false): Promise<{
  migratedStudents: number;
  migratedTeachers: number;
}> {
  if (hasAutoMigrated && !force) {
    return { migratedStudents: 0, migratedTeachers: 0 };
  }

  await connectDB();

  let migratedStudents = 0;
  let migratedTeachers = 0;

  // 1. Fetch all teachers
  const teachers = await User.find({ role: "teacher" });

  for (const teacher of teachers) {
    const subject = (teacher.subject || "Physics").trim();
    const assignedStudents = Array.isArray(teacher.assignedStudents) ? teacher.assignedStudents : [];

    for (const studentRef of assignedStudents) {
      if (!studentRef) continue;
      const student = await Student.findById(studentRef);
      if (!student) continue;

      let changed = false;
      if (!student.mentorAssignments) {
        student.mentorAssignments = [];
      }

      // Check if student already has a mentor for this subject
      const existingAssignmentIndex = student.mentorAssignments.findIndex(
        (ma) => ma.subject.toLowerCase() === subject.toLowerCase()
      );

      if (existingAssignmentIndex === -1) {
        // No mentor assigned yet for this subject -> Assign this teacher
        student.mentorAssignments.push({
          subject,
          teacherId: teacher._id as mongoose.Types.ObjectId,
        });
        changed = true;
      } else {
        // Already assigned. If teacher matches, keep it.
        const currentTeacherId = student.mentorAssignments[existingAssignmentIndex].teacherId?.toString();
        if (currentTeacherId !== teacher._id.toString()) {
          // If teacher differs, update to this teacher
          student.mentorAssignments[existingAssignmentIndex].teacherId = teacher._id as mongoose.Types.ObjectId;
          changed = true;
        }
      }

      if (changed) {
        await student.save();
        migratedStudents++;
      }
    }
  }

  // 2. Fetch all students to ensure teachers' assignedStudents arrays are in sync
  const students = await Student.find({ mentorAssignments: { $exists: true, $ne: [] } });

  const teacherAssignedMap = new Map<string, Set<string>>();

  for (const student of students) {
    if (!student.mentorAssignments) continue;
    for (const assignment of student.mentorAssignments) {
      if (!assignment.teacherId) continue;
      const tId = assignment.teacherId.toString();
      if (!teacherAssignedMap.has(tId)) {
        teacherAssignedMap.set(tId, new Set<string>());
      }
      teacherAssignedMap.get(tId)!.add(student._id.toString());
    }
  }

  for (const teacher of teachers) {
    const tId = teacher._id.toString();
    const expectedStudents = teacherAssignedMap.get(tId) || new Set<string>();

    const currentAssigned = (teacher.assignedStudents || []).map((id: any) => id.toString());
    const unionSet = new Set<string>([...currentAssigned, ...Array.from(expectedStudents)]);

    if (unionSet.size !== currentAssigned.length) {
      teacher.assignedStudents = Array.from(unionSet).map((id) => new mongoose.Types.ObjectId(id));
      await teacher.save();
      migratedTeachers++;
    }
  }

  hasAutoMigrated = true;
  return { migratedStudents, migratedTeachers };
}

export interface TeacherScope {
  teacher: IUser | null;
  subject: string;
  assignedStudentObjectIds: mongoose.Types.ObjectId[];
  assignedStudentIdStrings: string[];
  assignedStudentCodes: string[];
  allStudentIdentifiers: string[];
}

/**
 * Retrieves a teacher's subject and assigned students (both ObjectIds and studentId codes).
 */
export async function getTeacherScope(teacherId: string | mongoose.Types.ObjectId): Promise<TeacherScope> {
  await connectDB();

  const teacher = await User.findById(teacherId);
  if (!teacher || teacher.role !== "teacher") {
    return {
      teacher: null,
      subject: "",
      assignedStudentObjectIds: [],
      assignedStudentIdStrings: [],
      assignedStudentCodes: [],
      allStudentIdentifiers: [],
    };
  }

  const subject = (teacher.subject || "Physics").trim();

  // Find students assigned via teacher.assignedStudents OR via Student.mentorAssignments
  const teacherObjId = new mongoose.Types.ObjectId(teacherId);
  const directStudentIds = (teacher.assignedStudents || []).map((id: any) => id.toString());

  const students = await Student.find({
    $or: [
      { _id: { $in: directStudentIds.map((id) => new mongoose.Types.ObjectId(id)) } },
      { "mentorAssignments.teacherId": teacherObjId },
    ],
  }).select("_id studentId name email");

  const studentObjectIds: mongoose.Types.ObjectId[] = [];
  const studentIdStrings: string[] = [];
  const studentCodes: string[] = [];
  const allIdentifiers: string[] = [];

  for (const s of students) {
    studentObjectIds.push(s._id as mongoose.Types.ObjectId);
    studentIdStrings.push(s._id.toString());
    allIdentifiers.push(s._id.toString());

    if (s.studentId) {
      studentCodes.push(s.studentId);
      allIdentifiers.push(s.studentId);
    }
  }

  return {
    teacher,
    subject,
    assignedStudentObjectIds: studentObjectIds,
    assignedStudentIdStrings: studentIdStrings,
    assignedStudentCodes: studentCodes,
    allStudentIdentifiers: Array.from(new Set(allIdentifiers)),
  };
}

/**
 * Assigns a teacher to a student for a specific subject (One Mentor per Subject rule).
 * If the student already has another mentor for that subject, that mentor is replaced.
 */
export async function assignMentorToStudent(
  studentId: string | mongoose.Types.ObjectId,
  teacherId: string | mongoose.Types.ObjectId,
  subject: string
): Promise<{ success: boolean; message?: string }> {
  await connectDB();

  const student = await Student.findById(studentId);
  if (!student) {
    return { success: false, message: "Student not found" };
  }

  const teacher = await User.findById(teacherId);
  if (!teacher || teacher.role !== "teacher") {
    return { success: false, message: "Teacher not found" };
  }

  const targetSubject = (subject || teacher.subject || "Physics").trim();

  if (!student.mentorAssignments) {
    student.mentorAssignments = [];
  }

  // Check if student already has a mentor for this subject
  const existingIndex = student.mentorAssignments.findIndex(
    (ma) => ma.subject.toLowerCase() === targetSubject.toLowerCase()
  );

  const newTeacherObjId = new mongoose.Types.ObjectId(teacherId);
  const studentObjId = new mongoose.Types.ObjectId(studentId);

  if (existingIndex >= 0) {
    const oldTeacherId = student.mentorAssignments[existingIndex].teacherId;
    if (oldTeacherId && oldTeacherId.toString() !== teacherId.toString()) {
      // Remove student from old teacher's assignedStudents
      await User.findByIdAndUpdate(oldTeacherId, {
        $pull: { assignedStudents: studentObjId },
      });
    }
    student.mentorAssignments[existingIndex].teacherId = newTeacherObjId;
  } else {
    student.mentorAssignments.push({
      subject: targetSubject,
      teacherId: newTeacherObjId,
    });
  }

  await student.save();

  // Add student to new teacher's assignedStudents (if not already there)
  await User.findByIdAndUpdate(teacherId, {
    $addToSet: { assignedStudents: studentObjId },
  });

  return { success: true };
}

/**
 * Removes a teacher's assignment for a student for a specific subject.
 */
export async function unassignMentorFromStudent(
  studentId: string | mongoose.Types.ObjectId,
  teacherId: string | mongoose.Types.ObjectId,
  subject: string
): Promise<{ success: boolean }> {
  await connectDB();

  const studentObjId = new mongoose.Types.ObjectId(studentId);
  const teacherObjId = new mongoose.Types.ObjectId(teacherId);

  await Student.findByIdAndUpdate(studentId, {
    $pull: {
      mentorAssignments: {
        subject: { $regex: new RegExp(`^${subject.trim()}$`, "i") },
        teacherId: teacherObjId,
      },
    },
  });

  await User.findByIdAndUpdate(teacherId, {
    $pull: { assignedStudents: studentObjId },
  });

  return { success: true };
}
