"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  allow: AppRole[];
  fallback?: string;
}

export const RoleRoute = ({ children, allow, fallback = "/" }: Props) => {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace(fallback);
      } else if (role && !allow.includes(role)) {
        if (role === "admin") router.replace("/admin/dashboard");
        else if (role === "teacher") router.replace("/teacher/dashboard");
        else if (role === "parent") router.replace("/parent/dashboard");
        else router.replace("/dashboard");
      }
    }
  }, [loading, user, role, allow, fallback, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (role && !allow.includes(role))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};
