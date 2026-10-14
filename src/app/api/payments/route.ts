import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { Student } from "@/models/Student";
import { Announcement } from "@/models/Announcement";
import { serverCache } from "@/lib/cache";
import { sendInvoiceCreatedNotification } from "@/lib/notifications";

// GET payments (filtered by user role)
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
      query = { studentId: { $in: Array.from(new Set(studentIds)) } };
    } else if (user.role === "parent") {
      const studentIds: string[] = [];
      if (user.studentId) studentIds.push(String(user.studentId));
      const parentUser = await User.findById(user.id);
      if (parentUser?.linkedStudentId) {
        studentIds.push(parentUser.linkedStudentId.toString());
        const linkedStudent = await Student.findById(parentUser.linkedStudentId);
        if (linkedStudent) {
          if (linkedStudent.studentId) studentIds.push(linkedStudent.studentId);
          if (linkedStudent._id) studentIds.push(linkedStudent._id.toString());
        }
      }
      query = { studentId: { $in: Array.from(new Set(studentIds)) } };
    } else {
      return NextResponse.json([]);
    }

    const payments = await Payment.find(query).sort({ dueDate: -1 });
    return NextResponse.json(payments);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// POST create payment record (requires admin)
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { studentId, studentName, amount, status, dueDate, paidAt, classGrade, batch, description } = await req.json();

    if (!studentId || !studentName || amount === undefined || !dueDate) {
      return NextResponse.json({ message: "Student ID, student name, amount, and due date are required" }, { status: 400 });
    }

    const newPayment = new Payment({
      studentId,
      studentName,
      amount: Number(amount),
      status: status || "pending",
      dueDate: new Date(dueDate),
      paidAt: paidAt ? new Date(paidAt) : undefined,
      classGrade: classGrade || "",
      batch: batch || "",
      description: description || "Tuition & Course Academic Fee",
    });
    await newPayment.save();

    // Look up student details for notification dispatch
    const studentDoc = await Student.findOne({
      $or: [{ _id: studentId }, { studentId: studentId }],
    }).lean();

    const userDoc = await User.findOne({
      $or: [{ _id: studentId }, { studentId: studentId }],
    }).lean();

    const studentEmail = (studentDoc as any)?.email || (userDoc as any)?.email;
    const studentPhone = (studentDoc as any)?.phone || (userDoc as any)?.phone;
    const studentCode = (studentDoc as any)?.studentId || (userDoc as any)?.studentId || studentId;

    // Look up parent if linked
    let parentEmail: string | undefined;
    let parentPhone: string | undefined;
    const parentUser = await User.findOne({
      role: "parent",
      $or: [
        { linkedStudentId: studentId },
        { linkedStudentId: (studentDoc as any)?._id },
        { studentId: studentId },
      ],
    }).lean();

    if (parentUser) {
      if (parentUser.email) parentEmail = parentUser.email;
      if (parentUser.phone) parentPhone = parentUser.phone;
    }

    // Trigger Message 1 (Invoice Created Notification: WhatsApp & Email)
    const notifResult = await sendInvoiceCreatedNotification({
      studentName,
      studentCode,
      amount: Number(amount),
      dueDate: new Date(dueDate),
      classGrade: classGrade || (studentDoc as any)?.course || "",
      description: description || "Tuition & Course Academic Fee",
      studentPhone,
      studentEmail,
      parentPhone,
      parentEmail,
    });

    // Create private in-app notification exclusively for the student
    const studentIdentifier = String(studentDoc?._id || studentId);
    const studentIdsList = Array.from(new Set([studentIdentifier, String(studentId), String(studentCode)].filter(Boolean)));
    const dueDateStr = new Date(dueDate).toLocaleDateString("en-IN", { dateStyle: "medium" });

    try {
      await Announcement.create({
        title: `New Fee Invoice: ₹${Number(amount).toLocaleString("en-IN")}`,
        content: `Dear ${studentName}, a new fee invoice of ₹${Number(amount).toLocaleString("en-IN")} for ${description || "Tuition & Academic Course"} has been issued (Due Date: ${dueDateStr}). Please review and complete your payment online via the Fee & Payments portal.`,
        priority: "medium",
        studentId: studentIdentifier,
        studentIds: studentIdsList,
        is_global: false,
        category: "fee",
        authorRole: "admin",
      });
    } catch (announcementErr) {
      console.warn("Could not create invoice announcement:", announcementErr);
    }

    serverCache.invalidateTags(["bootstrap"]);
    serverCache.clear();

    const returnObj = {
      ...newPayment.toObject(),
      id: newPayment._id.toString(),
      _id: newPayment._id.toString(),
      whatsappUrl: notifResult.whatsappUrl,
      whatsappText: notifResult.whatsappText,
      targetPhone: notifResult.targetPhone,
    };

    return NextResponse.json(returnObj, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
