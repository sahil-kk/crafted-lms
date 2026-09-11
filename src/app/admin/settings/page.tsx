"use client";
import AdminSettings from "@/views/admin/AdminSettings";
import { RoleRoute } from "@/components/RoleRoute";

export default function AdminSettingsPage() {
  return (
    <RoleRoute allow={["admin"]} fallback="/admin">
      <AdminSettings />
    </RoleRoute>
  );
}
