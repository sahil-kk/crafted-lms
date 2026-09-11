"use client";
import ExamQuestionsEditor from "@/views/shared/ExamQuestionsEditor";
import { RoleRoute } from "@/components/RoleRoute";

export default function TeacherExamQuestionsPage() {
  return (
    <RoleRoute allow={["teacher"]} fallback="/teacher">
      <ExamQuestionsEditor viewerRole="teacher" />
    </RoleRoute>
  );
}
