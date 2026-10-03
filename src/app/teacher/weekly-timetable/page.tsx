"use client";

import { RoleRoute } from "@/components/RoleRoute";
import WeeklyTimetablePage from "@/views/teacher/WeeklyTimetablePage";

export default function Page() {
  return (
    <RoleRoute allow={["teacher", "admin"]}>
      <WeeklyTimetablePage />
    </RoleRoute>
  );
}
