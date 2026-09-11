"use client";
import ResultsManager from "@/views/shared/ResultsManager";
import { RoleRoute } from "@/components/RoleRoute";

export default function AdminResultsPage() {
  return (
    <RoleRoute allow={["admin"]} fallback="/admin">
      <ResultsManager viewerRole="admin" />
    </RoleRoute>
  );
}
