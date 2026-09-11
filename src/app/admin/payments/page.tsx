"use client";
import AdminPayments from "@/views/admin/AdminPayments";
import { RoleRoute } from "@/components/RoleRoute";

export default function AdminPaymentsPage() {
  return (
    <RoleRoute allow={["admin"]} fallback="/admin">
      <AdminPayments />
    </RoleRoute>
  );
}
