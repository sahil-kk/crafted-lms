"use client";
import ExamsManager from "@/views/shared/ExamsManager";
import { RoleRoute } from "@/components/RoleRoute";

export default function AdminExamsPage() {
  return (
    <RoleRoute allow={["admin"]} fallback="/admin">
      <ExamsManager viewerRole="admin" />
    </RoleRoute>
  );
}
