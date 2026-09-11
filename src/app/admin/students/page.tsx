"use client";
import { ManageUsersPage } from "@/views/shared/ManageUsersPage";
import { RoleRoute } from "@/components/RoleRoute";

export default function AdminStudentsPage() {
  return (
    <RoleRoute allow={["admin"]} fallback="/admin">
      <ManageUsersPage role="student" viewerRole="admin" title="Students" description="Manage all students on the platform" />
    </RoleRoute>
  );
}
