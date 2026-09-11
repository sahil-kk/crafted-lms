"use client";
import ParentDashboard from "@/views/parent/ParentDashboard";
import { RoleRoute } from "@/components/RoleRoute";

export default function ParentProfilePage() {
  return (
    <RoleRoute allow={["parent"]} fallback="/?role=parent">
      <ParentDashboard />
    </RoleRoute>
  );
}
