"use client";
import StudentResults from "@/views/student/StudentResults";
import { RoleRoute } from "@/components/RoleRoute";

export default function StudentResultsPage() {
  return (
    <RoleRoute allow={["student"]}>
      <StudentResults />
    </RoleRoute>
  );
}
