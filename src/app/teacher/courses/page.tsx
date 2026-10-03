"use client";

import AdminCourses from "@/views/admin/AdminCourses";
import { RoleRoute } from "@/components/RoleRoute";

export default function TeacherCoursesPage() {
  return (
    <RoleRoute allow={["teacher", "admin"]} fallback="/teacher">
      <AdminCourses viewerRole="teacher" />
    </RoleRoute>
  );
}
