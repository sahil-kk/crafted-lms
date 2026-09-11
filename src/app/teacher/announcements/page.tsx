"use client";
import AnnouncementsManager from "@/views/shared/AnnouncementsManager";
import { RoleRoute } from "@/components/RoleRoute";

export default function TeacherAnnouncementsPage() {
  return (
    <RoleRoute allow={["teacher"]} fallback="/teacher">
      <AnnouncementsManager viewerRole="teacher" />
    </RoleRoute>
  );
}
