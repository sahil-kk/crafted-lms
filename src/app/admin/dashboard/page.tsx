"use client";
import AdminDashboard from "@/views/admin/AdminDashboard";
import { RoleRoute } from "@/components/RoleRoute";

export default function AdminDashboardPage() {
  return (
    <RoleRoute allow={["admin"]} fallback="/admin">
      <AdminDashboard />
    </RoleRoute>
  );
}
