"use client";
import StudentProfile from "@/views/student/StudentProfile";
import { RoleRoute } from "@/components/RoleRoute";

export default function StudentProfilePage() {
  return (
    <RoleRoute allow={["student"]}>
      <StudentProfile />
    </RoleRoute>
  );
}
