"use client";
import ParentCommunicationCenter from "@/views/shared/ParentCommunicationCenter";
import { RoleRoute } from "@/components/RoleRoute";

export default function TeacherMessagesPage() {
  return (
    <RoleRoute allow={["teacher"]} fallback="/teacher">
      <ParentCommunicationCenter role="teacher" />
    </RoleRoute>
  );
}
