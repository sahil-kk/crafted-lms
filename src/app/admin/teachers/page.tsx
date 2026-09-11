"use client";
import { ManageUsersPage } from "@/views/shared/ManageUsersPage";
import { RoleRoute } from "@/components/RoleRoute";

export default function AdminTeachersPage() {
  return (
    <RoleRoute allow={["admin"]} fallback="/admin">
      <ManageUsersPage role="teacher" viewerRole="admin" title="Teachers" description="Manage all teachers on the platform" />
    </RoleRoute>
  );
}
