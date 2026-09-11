"use client";
import TimetableManager from "@/views/shared/TimetableManager";
import { RoleRoute } from "@/components/RoleRoute";

export default function TeacherTimetablePage() {
  return (
    <RoleRoute allow={["teacher"]} fallback="/teacher">
      <TimetableManager viewerRole="teacher" />
    </RoleRoute>
  );
}
