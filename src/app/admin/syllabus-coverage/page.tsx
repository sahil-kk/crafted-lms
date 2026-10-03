"use client";

import { RoleRoute } from "@/components/RoleRoute";
import SyllabusCoveragePage from "@/views/admin/SyllabusCoveragePage";

export default function Page() {
  return (
    <RoleRoute allow={["admin", "teacher"]}>
      <SyllabusCoveragePage />
    </RoleRoute>
  );
}
