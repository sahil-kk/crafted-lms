"use client";
import ParentCommunicationCenter from "@/views/shared/ParentCommunicationCenter";
import { RoleRoute } from "@/components/RoleRoute";

export default function AdminParentControlsPage() {
  return (
    <RoleRoute allow={["admin"]} fallback="/admin">
      <ParentCommunicationCenter role="admin" />
    </RoleRoute>
  );
}
