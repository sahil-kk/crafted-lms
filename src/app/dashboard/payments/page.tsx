"use client";

import StudentPayments from "@/views/student/StudentPayments";
import { RoleRoute } from "@/components/RoleRoute";

export default function StudentPaymentsPage() {
  return (
    <RoleRoute allow={["student"]}>
      <StudentPayments />
    </RoleRoute>
  );
}
