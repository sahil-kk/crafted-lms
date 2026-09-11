"use client";
import TakeExam from "@/views/student/TakeExam";
import { RoleRoute } from "@/components/RoleRoute";

export default function TakeExamPage() {
  return (
    <RoleRoute allow={["student"]}>
      <TakeExam />
    </RoleRoute>
  );
}
