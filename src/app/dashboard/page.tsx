"use client";
import StudentDashboard from "@/views/student/StudentDashboard";
import { RoleRoute } from "@/components/RoleRoute";

export default function StudentDashboardPage() {
  return (
    <RoleRoute allow={["student"]}>
      <StudentDashboard />
    </RoleRoute>
  );
}
