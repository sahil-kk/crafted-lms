"use client";

import ParentPayments from "@/views/parent/ParentPayments";
import { RoleRoute } from "@/components/RoleRoute";

export default function ParentPaymentsPage() {
  return (
    <RoleRoute allow={["parent"]} fallback="/?role=parent">
      <ParentPayments />
    </RoleRoute>
  );
}
