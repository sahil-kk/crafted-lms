"use client";
import StudentTimetable from "@/views/student/StudentTimetable";
import { RoleRoute } from "@/components/RoleRoute";

export default function StudentTimetablePage() {
  return (
    <RoleRoute allow={["student"]}>
      <StudentTimetable />
    </RoleRoute>
  );
}
