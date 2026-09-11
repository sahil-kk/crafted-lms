"use client";
import StudentExams from "@/views/student/StudentExams";
import { RoleRoute } from "@/components/RoleRoute";

export default function StudentExamsPage() {
  return (
    <RoleRoute allow={["student"]}>
      <StudentExams />
    </RoleRoute>
  );
}
