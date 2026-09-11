"use client";
import ExamsManager from "@/views/shared/ExamsManager";
import { RoleRoute } from "@/components/RoleRoute";

export default function TeacherExamsPage() {
  return (
    <RoleRoute allow={["teacher"]} fallback="/teacher">
      <ExamsManager viewerRole="teacher" />
    </RoleRoute>
  );
}
