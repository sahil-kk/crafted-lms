"use client";

import { RoleRoute } from "@/components/RoleRoute";
import ClassRegisterPage from "@/views/teacher/ClassRegisterPage";

export default function Page() {
  return (
    <RoleRoute allow={["teacher", "admin"]}>
      <ClassRegisterPage />
    </RoleRoute>
  );
}
