"use client";
import ClassesManager from "@/views/shared/ClassesManager";
import { RoleRoute } from "@/components/RoleRoute";

export default function TeacherClassesPage() {
  return (
    <RoleRoute allow={["teacher"]} fallback="/teacher">
      <ClassesManager viewerRole="teacher" />
    </RoleRoute>
  );
}
