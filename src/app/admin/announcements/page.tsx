"use client";
import AnnouncementsManager from "@/views/shared/AnnouncementsManager";
import { RoleRoute } from "@/components/RoleRoute";

export default function AdminAnnouncementsPage() {
  return (
    <RoleRoute allow={["admin"]} fallback="/admin">
      <AnnouncementsManager viewerRole="admin" />
    </RoleRoute>
  );
}
