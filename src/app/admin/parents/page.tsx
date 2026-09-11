"use client";
import { ManageUsersPage } from "@/views/shared/ManageUsersPage";
import { RoleRoute } from "@/components/RoleRoute";

export default function AdminParentsPage() {
  return (
    <RoleRoute allow={["admin"]} fallback="/admin">
      <ManageUsersPage role="parent" viewerRole="admin" title="Parents" description="Create parent portal accounts linked to students" />
    </RoleRoute>
  );
}
