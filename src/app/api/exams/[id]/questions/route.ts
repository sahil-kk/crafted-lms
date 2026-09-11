import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Exam } from "@/models/Exam";

// GET questions for an exam (requires authenticated session)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const exam = await Exam.findById(id).select("questions");
    if (!exam) {
      return NextResponse.json({ message: "Exam not found" }, { status: 404 });
    }
    return NextResponse.json(exam.questions || []);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// POST add a question to an exam (requires admin or teacher)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const { question_text, question_type, marks, options, correct_answer, id: qId } = body;

    if (!question_text) {
      return NextResponse.json({ message: "Question text is required" }, { status: 400 });
    }

    const exam = await Exam.findById(id);
    if (!exam) {
      return NextResponse.json({ message: "Exam not found" }, { status: 404 });
    }

    const newQuestionId = qId || `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const position = exam.questions?.length || 0;

    const questionObj = {
      id: newQuestionId,
      exam_id: id,
      question_text,
      question_type: question_type || "mcq",
      marks: Number(marks) || 1,
      options: Array.isArray(options) ? options : null,
      correct_answer: correct_answer || null,
      position,
    };

    const updated = await Exam.findByIdAndUpdate(
      id,
      { $push: { questions: questionObj } },
      { new: true }
    );

    return NextResponse.json({ message: "Question added", question: questionObj, exam: updated }, { status: 201 });
  } catch (err: any) {
    console.error("Error adding question:", err);
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// DELETE a question from an exam (requires admin or teacher)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin", "teacher"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const url = new URL(req.url);
    const questionId = url.searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json({ message: "questionId is required" }, { status: 400 });
    }

    const updated = await Exam.findByIdAndUpdate(
      id,
      { $pull: { questions: { id: questionId } } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ message: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Question deleted", exam: updated });
  } catch (err: any) {
    console.error("Error deleting question:", err);
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
