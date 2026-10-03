"use client";

import { RoleRoute } from "@/components/RoleRoute";
import AdminPayrollPage from "@/views/admin/AdminPayrollPage";

export default function Page() {
  return (
    <RoleRoute allow={["admin"]}>
      <AdminPayrollPage />
    </RoleRoute>
  );
}
