"use client";
import TimetableManager from "@/views/shared/TimetableManager";
import { RoleRoute } from "@/components/RoleRoute";

export default function AdminTimetablePage() {
  return (
    <RoleRoute allow={["admin"]} fallback="/admin">
      <TimetableManager viewerRole="admin" />
    </RoleRoute>
  );
}
