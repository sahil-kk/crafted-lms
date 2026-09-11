"use client";
import TeacherDashboard from "@/views/teacher/TeacherDashboard";
import { RoleRoute } from "@/components/RoleRoute";

export default function TeacherDashboardPage() {
  return (
    <RoleRoute allow={["teacher"]} fallback="/teacher">
      <TeacherDashboard />
    </RoleRoute>
  );
}
