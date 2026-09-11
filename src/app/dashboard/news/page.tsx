"use client";
import StudentNews from "@/views/student/StudentNews";
import { RoleRoute } from "@/components/RoleRoute";

export default function StudentNewsPage() {
  return (
    <RoleRoute allow={["student"]}>
      <StudentNews />
    </RoleRoute>
  );
}
