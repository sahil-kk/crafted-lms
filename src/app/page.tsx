"use client";

import { LoginShell } from "@/components/auth/LoginShell";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function StudentLoginPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      if (role === "student") router.replace("/dashboard");
      else if (role === "teacher") router.replace("/teacher/dashboard");
      else if (role === "admin") router.replace("/admin/dashboard");
      else if (role === "parent") router.replace("/parent/dashboard");
    }
  }, [user, role, loading, router]);

  return <LoginShell />;
}
