"use client";
import ResultsManager from "@/views/shared/ResultsManager";
import { RoleRoute } from "@/components/RoleRoute";

export default function TeacherResultsPage() {
  return (
    <RoleRoute allow={["teacher"]} fallback="/teacher">
      <ResultsManager viewerRole="teacher" />
    </RoleRoute>
  );
}
