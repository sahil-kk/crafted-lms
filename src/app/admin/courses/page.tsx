"use client";
import AdminCourses from "@/views/admin/AdminCourses";
import { RoleRoute } from "@/components/RoleRoute";

export default function AdminCoursesPage() {
  return (
    <RoleRoute allow={["admin"]} fallback="/admin">
      <AdminCourses />
    </RoleRoute>
  );
}
