"use client";
import ExamQuestionsEditor from "@/views/shared/ExamQuestionsEditor";
import { RoleRoute } from "@/components/RoleRoute";

export default function AdminExamQuestionsPage() {
  return (
    <RoleRoute allow={["admin"]} fallback="/admin">
      <ExamQuestionsEditor viewerRole="admin" />
    </RoleRoute>
  );
}
