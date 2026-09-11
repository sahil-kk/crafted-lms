"use client";
import AdminGrowthMeter from "@/views/admin/AdminGrowthMeter";
import { RoleRoute } from "@/components/RoleRoute";

export default function AdminGrowthMeterPage() {
  return (
    <RoleRoute allow={["admin"]} fallback="/admin">
      <AdminGrowthMeter />
    </RoleRoute>
  );
}
