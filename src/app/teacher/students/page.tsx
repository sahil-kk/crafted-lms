"use client";
import { ManageUsersPage } from "@/views/shared/ManageUsersPage";
import { RoleRoute } from "@/components/RoleRoute";

export default function TeacherStudentsPage() {
  return (
    <RoleRoute allow={["teacher"]} fallback="/teacher">
      <ManageUsersPage role="student" viewerRole="teacher" title="My Students" description="Students on the platform" />
    </RoleRoute>
  );
}
