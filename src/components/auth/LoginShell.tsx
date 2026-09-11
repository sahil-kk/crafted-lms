"use client";

import { useState, useEffect, useRef, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import {
  GraduationCap,
  BookOpen,
  Users,
  Shield,
  User,
  Lock,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  identifier: z.string().trim().min(3, "At least 3 characters").max(255),
  password: z.string().min(5, "At least 5 characters").max(72),
});

type LoginRole = "student" | "teacher" | "parent" | "admin";

const LoginContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  // Get active role from search parameters, default to student
  const activeRole = ((searchParams?.get("role")) || "student") as LoginRole;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const formPanelRef = useRef<HTMLDivElement>(null);
  const identifierInputRef = useRef<HTMLInputElement>(null);

  // Clear fields when role changes
  useEffect(() => {
    setIdentifier("");
    setPassword("");
  }, [activeRole]);

  const handleRoleChange = (role: LoginRole) => {
    router.push(`/?role=${role}`);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      window.setTimeout(() => {
        formPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        identifierInputRef.current?.focus({ preventScroll: true });
      }, 80);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ identifier, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setIsLoggingIn(true);
    try {
      await signIn(activeRole, identifier, password);

      if (activeRole === "parent") {
        toast.success("Signed in successfully as Parent");
        router.replace("/parent/dashboard");
      } else {
        toast.success("Login successful");
        const redirectPath =
          activeRole === "student"
            ? "/dashboard"
            : activeRole === "teacher"
              ? "/teacher/dashboard"
              : "/admin/dashboard";
        router.replace(redirectPath);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to log in";
      toast.error(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Content for role selection cards (Public Roles: Student, Teacher, Parent)
  const roleCards = [
    {
      id: "student" as LoginRole,
      title: "Students",
      description: "Access assignments & track progress",
      icon: GraduationCap,
    },
    {
      id: "teacher" as LoginRole,
      title: "Teachers",
      description: "Manage classes & provide feedback",
      icon: BookOpen,
    },
    {
      id: "parent" as LoginRole,
      title: "Parents",
      description: "Monitor child's academic progress",
      icon: Users,
    },
  ];

  // Config per role for the login card
  const roleConfig = {
    student: {
      badgeText: "Student Portal",
      badgeColor: "bg-primary-soft text-primary border-[#f97316]/50",
      title: "Student Sign In",
      subtitle: "Sign in to continue your learning journey",
      idLabel: "Student ID",
      idPlaceholder: "e.g. student123",
      footerHint: "Don't have an account? Ask your institute admin to create one."
    },
    teacher: {
      badgeText: "Teacher Portal",
      badgeColor: "bg-primary-soft text-primary border-[#f97316]/50",
      title: "Teacher Sign In",
      subtitle: "Access your classes, exams and students",
      idLabel: "Email / Username",
      idPlaceholder: "e.g. teacher@school.com",
      footerHint: "Tip: Use the username or email address set by your admin."
    },
    parent: {
      badgeText: "Parent Access",
      badgeColor: "bg-primary-soft text-primary border-[#f97316]/50",
      title: "Parent Sign In",
      subtitle: "Monitor your child's academic progress",
      idLabel: "Student ID / Parent Username",
      idPlaceholder: "e.g. student123 or parent@example.com",
      footerHint: "Use the linked student's ID with the parent password, or use the parent username."
    },
    admin: {
      badgeText: "Admin Control",
      badgeColor: "bg-primary-soft text-primary border-[#f97316]/50",
      title: "Admin Sign In",
      subtitle: "Oversee system and platform settings",
      idLabel: "Admin Username",
      idPlaceholder: "e.g. admin",
      footerHint: "System administration credentials required."
    }
  };

  const currentConfig = roleConfig[activeRole] || roleConfig.student;

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-white lg:overflow-hidden relative font-sans">
      {/* Left: Branding & Selection */}
      <div className="w-full lg:w-[58%] px-5 py-5 sm:p-10 lg:p-16 flex flex-col justify-between relative bg-gradient-primary z-10">
        {/* Decorative bright ambient background glows */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-white/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-yellow-300/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Top: Logo */}
        <div className="flex items-center justify-center lg:justify-start gap-2.5 mb-5 lg:mb-0">
          <img
            src="/logo.svg"
            alt="Crafted"
            className="h-12 sm:h-14 lg:h-16 w-auto max-w-[168px] sm:max-w-[190px] lg:max-w-[200px] object-contain bg-white rounded-xl lg:rounded-2xl shadow-elevated px-4 py-2.5 lg:p-3 lg:pl-4 lg:pr-4 transition-all duration-300 hover:scale-105"
          />
        </div>

        {/* Center Content */}
        <div className="space-y-5 lg:space-y-8 mt-4 mb-auto lg:mt-10 lg:mb-auto max-w-2xl py-1 lg:py-0">
          <div className="space-y-3 lg:space-y-4">
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] text-balance text-center lg:text-left">
              Welcome to{" "}
              <span className="block mt-3 lg:inline-block">
                <span className="inline-flex bg-white px-5 py-2 rounded-2xl shadow-elevated border border-[#f97316]/25 hover:rotate-1 transition-transform duration-200">
                  <span className="font-baloo text-3xl sm:text-4xl lg:text-5xl font-black tracking-wider text-[#f97316]">
                    crafted.
                  </span>
                </span>
              </span>
            </h1>
            <p className="text-white/95 text-center lg:text-left text-xl sm:text-2xl lg:text-3xl leading-relaxed max-w-xl mx-auto lg:mx-0 font-semibold sm:font-medium">
              Learn from the<br />
              people who've been<br />
              there and{" "}
              <button
                type="button"
                onClick={() => handleRoleChange("admin")}
                className="text-slate-950 font-black ml-1 inline-block focus:outline-none border-none bg-transparent p-0"
              >
                done it.
              </button>
            </p>
          </div>

          {/* Role selection card grid */}
          <div className="space-y-3 lg:space-y-4 pt-1 lg:pt-4">
            <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-bold uppercase tracking-wider text-white/90">
              <Sparkles className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-white animate-pulse" />
              <span>Select Your Role</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
              {roleCards.map((rc) => {
                const IconComponent = rc.icon;
                const isSelected = activeRole === rc.id;
                return (
                  <button
                    type="button"
                    key={rc.id}
                    onClick={() => handleRoleChange(rc.id)}
                    aria-pressed={isSelected}
                    className={`relative min-h-[104px] lg:min-h-0 rounded-2xl p-3.5 lg:p-5 cursor-pointer border transition-all duration-300 flex flex-col items-center lg:items-start text-center lg:text-left gap-2.5 lg:gap-3 group ${
                      isSelected
                        ? "bg-white/20 border-white shadow-[0_10px_30px_rgba(0,0,0,0.15)] ring-2 lg:ring-4 ring-white/10"
                        : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 hover:scale-[1.01]"
                    }`}
                  >
                    {/* Active selection dot */}
                    {isSelected && (
                      <span className="absolute top-3 right-3 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                    )}

                    <div
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        isSelected
                          ? "bg-white text-primary shadow-sm"
                          : "bg-white/10 text-white group-hover:bg-white/20"
                      }`}
                    >
                      <IconComponent className="h-5 w-5 lg:h-6 lg:w-6" />
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white leading-tight">
                        {rc.title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs sm:text-sm text-white/70 mt-5 lg:mt-0 font-medium">
          © {new Date().getFullYear()} Crafted. All rights reserved.
        </div>
      </div>

      {/* Right: Form Panel */}
      <div
        ref={formPanelRef}
        className="w-full lg:w-[42%] flex items-center justify-center px-4 py-5 sm:p-10 lg:p-16 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200/50 relative z-10 scroll-mt-0"
      >
        <div className="w-full max-w-md animate-fade-in">
          {/* Card */}
          <Card className="p-6 sm:p-8 lg:p-10 shadow-card border-slate-100 bg-white text-slate-900 rounded-2xl lg:rounded-3xl relative overflow-hidden">
            {/* Background design accents */}
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/5 blur-xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-primary/5 blur-xl pointer-events-none" />

            <div className="mb-6 lg:mb-8">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {currentConfig.title}
              </h2>
              <p className="text-sm text-slate-500 mt-2 font-medium">
                {currentConfig.subtitle}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 lg:space-y-5">
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-semibold text-slate-700">
                  {currentConfig.idLabel}
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    ref={identifierInputRef}
                    id="identifier"
                    type="text"
                    placeholder={currentConfig.idPlaceholder}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="username"
                    required
                    className="pl-11 h-12 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-slate-900 placeholder:text-slate-400 text-sm font-medium transition-smooth"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="pl-11 pr-12 h-12 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-slate-900 placeholder:text-slate-400 text-sm font-medium transition-smooth"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 mt-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-elevated hover:shadow-glow hover:-translate-y-0.5 transition-smooth border-none outline-none"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2 justify-center">
                    Sign in <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2.5">
              <p className="text-xs text-slate-400 text-center font-medium leading-relaxed max-w-[280px]">
                {currentConfig.footerHint}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const LoginShell = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          Loading...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
};
