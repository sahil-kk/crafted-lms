import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Payment } from "@/models/Payment";
import { Student } from "@/models/Student";
import { User } from "@/models/User";
import { Announcement } from "@/models/Announcement";
import { serverCache } from "@/lib/cache";
import { sendPaymentReminderEmail } from "@/lib/mailer";

import mongoose from "mongoose";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;

    let payment = null;
    if (mongoose.isValidObjectId(id)) {
      payment = await Payment.findById(id);
    }
    if (!payment) {
      payment = await Payment.findOne({ $or: [{ _id: id }, { id: id }] }).catch(() => null);
    }

    if (!payment) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }

    // Lookup student details
    const studentDoc = await Student.findOne({
      $or: [{ _id: payment.studentId }, { studentId: payment.studentId }],
    }).lean();

    const userDoc = await User.findOne({
      $or: [{ _id: payment.studentId }, { studentId: payment.studentId }],
    }).lean();

    const studentEmail = (studentDoc as any)?.email || (userDoc as any)?.email;
    const studentName = payment.studentName || (studentDoc as any)?.name || (userDoc as any)?.name || "Student";

    // Lookup parent email if linked
    let parentEmail: string | undefined;
    const parentUser = await User.findOne({
      role: "parent",
      $or: [
        { linkedStudentId: payment.studentId },
        { linkedStudentId: (studentDoc as any)?._id },
        { studentId: payment.studentId },
      ],
    }).lean();

    if (parentUser?.email) {
      parentEmail = parentUser.email;
    }

    // 1. Send Email Reminder
    let emailSent = false;
    const primaryEmail = studentEmail || parentEmail;
    if (primaryEmail) {
      const mailRes = await sendPaymentReminderEmail({
        recipientEmail: primaryEmail,
        studentName,
        amount: payment.amount,
        dueDate: payment.dueDate,
        classGrade: payment.classGrade,
        description: payment.description,
      });
      emailSent = mailRes.success;

      // If both emails are different, send to parent too
      if (parentEmail && parentEmail !== primaryEmail) {
        sendPaymentReminderEmail({
          recipientEmail: parentEmail,
          studentName,
          amount: payment.amount,
          dueDate: payment.dueDate,
          classGrade: payment.classGrade,
          description: payment.description,
        }).catch(console.error);
      }
    }

    // 2. Create in-app high-priority announcement for the student
    const dueDateStr = new Date(payment.dueDate).toLocaleDateString("en-IN", { dateStyle: "medium" });
    try {
      await Announcement.create({
        title: `Fee Due Notice: ₹${payment.amount.toLocaleString("en-IN")}`,
        content: `Dear ${studentName}, your fee payment of ₹${payment.amount.toLocaleString("en-IN")} for ${payment.description || "Tuition & Academic Course"} is pending (Due Date: ${dueDateStr}). Please complete the payment via the Fee & Payments portal.`,
        priority: "high",
      });
    } catch (announcementErr) {
      console.warn("Could not create reminder announcement:", announcementErr);
    }

    // 3. Update payment record
    payment.reminderSentAt = new Date();
    payment.reminderCount = (payment.reminderCount || 0) + 1;
    await payment.save();

    serverCache.invalidateTags(["bootstrap"]);
    serverCache.clear();

    const payload = {
      ...payment.toObject(),
      id: payment._id.toString(),
      _id: payment._id.toString(),
    };

    return NextResponse.json({
      success: true,
      message: `Payment reminder sent successfully to ${studentName}${primaryEmail ? ` (${primaryEmail})` : ""}`,
      payment: payload,
    });
  } catch (err: any) {
    console.error("POST /api/payments/[id]/reminder error:", err);
    return NextResponse.json({ message: err.message || "Failed to send reminder" }, { status: 500 });
  }
}
