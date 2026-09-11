"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TeacherLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/?role=teacher");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700 font-medium">
      Loading...
    </div>
  );
}
