"use client";

import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useAppData } from "@/hooks/useAppData";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import {
  UserCircle, Camera, X, GraduationCap, Loader2
} from "lucide-react";

const StudentProfile = () => {
  const { user } = useAuth();
  const { users, updateUser } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const currentStudent = users.find((item) => item.id === user?.id || (user?.studentId && item.studentId === user.studentId) || (user?.email && item.email?.toLowerCase() === user.email.toLowerCase()));

  const [photo, setPhoto] = useState<string | null>(currentStudent?.profilePhoto || user?.profilePhoto || null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const backendPhoto = currentStudent?.profilePhoto ?? user?.profilePhoto ?? "";
    setPhoto(backendPhoto || null);
  }, [currentStudent?.profilePhoto, user?.profilePhoto]);

  const fullName = currentStudent?.full_name || user?.full_name || user?.email?.split("@")[0] || "Student";
  const studentId = currentStudent?.studentId || (user as any)?.studentId || currentStudent?.id || user?.id || "------";
  const email = user?.email || "—";
  const initials = fullName.slice(0, 2).toUpperCase();

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("photo", file);

      const res = await apiClient<any>(`/students/${user!.id}/profile-photo`, {
        method: "POST",
        body: formData,
      });

      setPhoto(res.profilePhoto);
      await updateUser({
        id: user!.id,
        role: "student",
        profilePhoto: res.profilePhoto,
      });
      setIsUploading(false);
      toast.success("Profile photo updated");
    } catch (err: unknown) {
      setIsUploading(false);
      setPhoto(currentStudent?.profilePhoto || user?.profilePhoto || null);
      const message = err instanceof Error ? err.message : "Please try again.";
      toast.error("Could not save photo to database", { description: message });
    }
  };

  const getPhotoUrl = (path: string | null) => {
    if (!path) return "";
    // Already a full URL (data URL, http, or https) — return as-is
    if (path.startsWith("data:") || path.startsWith("http")) return path;
    // Relative path from old backend — return as absolute path on same origin
    return path.startsWith("/") ? path : `/${path}`;
  };

  return (
    <DashboardLayout role="student">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold">My Profile</h2>
          <p className="text-muted-foreground mt-1">Manage your personal information and account settings</p>
        </div>

        <Card className="p-6 md:p-8 shadow-card border-border/60">
          <div className="grid md:grid-cols-12 gap-8 items-center md:items-start">

            {/* Left Column: Avatar & Name */}
            <div className="md:col-span-4 flex flex-col items-center text-center md:border-r md:border-border/60 md:pr-8">
              {/* Photo */}
              <div className="relative inline-block mx-auto mb-4">
                <div
                  className="h-28 w-28 rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-4xl border-4 border-white shadow-xl overflow-hidden relative"
                  style={{ background: "linear-gradient(135deg, #f97316, #f97316)" }}
                >
                  {photo ? (
                    <img src={getPhotoUrl(photo)} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1 z-10">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                      <span className="text-[10px] font-semibold text-white tracking-wide uppercase">Saving...</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => !isUploading && fileRef.current?.click()}
                  disabled={isUploading}
                  className={`absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-[#f97316] text-white flex items-center justify-center shadow-lg hover:bg-[#f97316] transition-colors ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
                  title="Change photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                {photo && (
                  <button
                    onClick={() => {
                      setPhoto(null);
                      updateUser({
                        id: user!.id,
                        role: "student",
                        profilePhoto: "",
                      })
                        .then(() => toast.success("Profile photo removed"))
                        .catch((err: unknown) => {
                          setPhoto(currentStudent?.profilePhoto || user?.profilePhoto || null);
                          const message = err instanceof Error ? err.message : "Please try again.";
                          toast.error("Could not remove photo from database", { description: message });
                        });
                    }}
                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-white text-destructive border border-border flex items-center justify-center shadow hover:bg-secondary transition-colors"
                    title="Remove photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              <h3 className="font-display font-bold text-xl text-foreground mt-2">{fullName}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Student</p>
            </div>

            {/* Right Column: Personal Information Details */}
            <div className="md:col-span-8 space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <UserCircle className="h-5 w-5" style={{ color: "#f97316" }} />
                <h3 className="font-display font-bold text-base text-foreground">Personal Information</h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Full Name
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-secondary/40 text-sm text-foreground font-medium">
                    {fullName}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Student ID
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-secondary/40 text-sm text-foreground font-mono font-semibold">
                    {studentId}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Email Address
                </label>
                <div className="px-3 py-2 rounded-xl bg-secondary/40 text-sm text-muted-foreground">
                  {email}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Class
                </label>
                <div className="px-3 py-2 rounded-xl bg-secondary/40 text-sm text-foreground capitalize flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" /> {currentStudent?.course || "General"}
                </div>
              </div>
            </div>

          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentProfile;
