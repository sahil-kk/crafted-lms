"use client";
import StudentClasses from "@/views/student/StudentClasses";
import { RoleRoute } from "@/components/RoleRoute";

export default function StudentClassesPage() {
  return (
    <RoleRoute allow={["student"]}>
      <StudentClasses />
    </RoleRoute>
  );
}
