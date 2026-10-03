"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap, Home, Newspaper, BookOpen, FileText, BarChart3,
  Bell, LogOut, Menu, Users, Megaphone, Settings, ClipboardList, Calendar,
  UserCircle, Video, CreditCard, TrendingUp, ShieldCheck, MessageSquare,
  CalendarCheck, Clock, Banknote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { useAppData } from "@/hooks/useAppData";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NavItem { title: string; url: string; icon: any; }

const navByRole: Record<AppRole, NavItem[]> = {
  student: [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "My Courses", url: "/dashboard/classes", icon: BookOpen },
    { title: "Exams", url: "/dashboard/exams", icon: FileText },
    { title: "Results", url: "/dashboard/results", icon: BarChart3 },
    { title: "Fees & Payments", url: "/dashboard/payments", icon: CreditCard },
    { title: "Profile", url: "/dashboard/profile", icon: UserCircle },
  ],
  teacher: [
    { title: "Dashboard", url: "/teacher/dashboard", icon: Home },
    { title: "Class Register", url: "/teacher/register", icon: CalendarCheck },
    { title: "Weekly Timetable", url: "/teacher/weekly-timetable", icon: Clock },
    { title: "Students", url: "/teacher/students", icon: Users },
    { title: "Classes", url: "/teacher/classes", icon: Video },
    { title: "Exams", url: "/teacher/exams", icon: ClipboardList },
    { title: "Results", url: "/teacher/results", icon: BarChart3 },
    { title: "Messages", url: "/teacher/messages", icon: MessageSquare },
    { title: "Announcements", url: "/teacher/announcements", icon: Megaphone },
  ],
  admin: [
    { title: "Dashboard", url: "/admin/dashboard", icon: Home },
    { title: "Payroll & Hours", url: "/admin/payroll", icon: Banknote },
    { title: "Weekly Timetable", url: "/teacher/weekly-timetable", icon: Clock },
    { title: "Syllabus Plan", url: "/admin/syllabus-coverage", icon: BookOpen },
    { title: "Timetable", url: "/admin/timetable", icon: Calendar },
    { title: "Students", url: "/admin/students", icon: Users },
    { title: "Parents", url: "/admin/parents", icon: ShieldCheck },
    { title: "Teachers", url: "/admin/teachers", icon: GraduationCap },
    { title: "Payments", url: "/admin/payments", icon: CreditCard },
    { title: "Growth Meter", url: "/admin/growth-meter", icon: TrendingUp },
    { title: "Parent Controls", url: "/admin/parent-controls", icon: MessageSquare },
    { title: "Courses", url: "/admin/courses", icon: BookOpen },
    { title: "Exams", url: "/admin/exams", icon: ClipboardList },
    { title: "Results", url: "/admin/results", icon: BarChart3 },
    { title: "Settings", url: "/admin/settings", icon: Settings },
  ],
  parent: [
    { title: "Dashboard", url: "/parent/dashboard", icon: Home },
    { title: "Fees & Payments", url: "/parent/payments", icon: CreditCard },
    { title: "Profile", url: "/parent/profile", icon: UserCircle },
    { title: "Results", url: "/parent/results", icon: BarChart3 },
    { title: "Growth Meter", url: "/parent/growth", icon: TrendingUp },
    { title: "Exams", url: "/parent/exams", icon: ClipboardList },
    { title: "Teachers", url: "/parent/teachers", icon: GraduationCap },
  ],
};

const AppSidebar = ({ role }: { role: AppRole }) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const router = useRouter();
  const pathname = usePathname() || "";
  const items = navByRole[role];

  return (
    <Sidebar collapsible="icon" className="border-0 shadow-lg hidden md:flex">
      <SidebarContent className="flex flex-col h-full bg-white">

        {/* Logo — clicks to dashboard */}
        <div
          className={cn(
            "flex items-center border-b cursor-pointer",
            collapsed ? "justify-center px-2 py-4" : "px-5 py-4"
          )}
          style={{ borderBottomColor: "#f9731630" }}
          onClick={() => router.push(role === "student" ? "/dashboard" : role === "teacher" ? "/teacher/dashboard" : role === "parent" ? "/parent/dashboard" : "/admin/dashboard")}
        >
          {collapsed ? (
            <img src="/favicon.ico" alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
          ) : (
            <img src="/logo.svg" alt="Crafted Learning Hub" className="h-14 max-w-[180px] object-contain" />
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
          {items.map((item) => {
            const isActive = pathname === item.url || (item.url !== "/dashboard" && !item.url.endsWith("/dashboard") && pathname.startsWith(item.url + "/"));
            return (
              <Link
                key={item.url}
                href={item.url}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 group",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-[#f97316] text-white shadow-md"
                    : "text-[#f97316]/70 hover:bg-[#f97316]/10 hover:text-[#f97316]"
                )}
              >
                <item.icon className={cn(
                  "shrink-0 transition-all duration-200",
                  collapsed ? "h-5 w-5" : "h-4 w-4",
                  isActive ? "text-white" : "text-[#f97316]/70 group-hover:text-[#f97316]"
                )} />
                {!collapsed && (
                  <span className="tracking-wide uppercase text-xs">
                    {item.title}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom spacer */}
        <div className="h-4" />
      </SidebarContent>
    </Sidebar>
  );
};

// ─── Mobile Bottom Navigation Bar ────────────────────────────────────────────
const MobileBottomNav = ({ role }: { role: AppRole }) => {
  const items = navByRole[role];
  const { toggleSidebar, open } = useSidebar();
  const pathname = usePathname() || "";

  // Roles with >5 items get first 4 + a "More" hamburger slot
  const needsMore = items.length > 5;
  const visibleItems = needsMore ? items.slice(0, 4) : items;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-around h-16 px-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.url || (item.url !== "/dashboard" && !item.url.endsWith("/dashboard") && pathname.startsWith(item.url + "/"));
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-all duration-200 min-w-[52px]",
                isActive ? "text-[#f97316]" : "text-gray-400 hover:text-[#f97316]"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200",
                isActive ? "bg-[#f97316]/10" : ""
              )}>
                <item.icon className={cn(
                  "h-5 w-5 transition-all duration-200",
                  isActive ? "text-[#f97316]" : "text-gray-400"
                )} />
              </div>
              <span className={cn(
                "text-[9px] font-semibold tracking-wide uppercase leading-none",
                isActive ? "text-[#f97316]" : "text-gray-400"
              )}>
                {item.title === "My Courses" ? "Courses" : item.title}
              </span>
            </Link>
          );
        })}

        {/* "More" hamburger — only for roles with >5 nav items */}
        {needsMore && (
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-all duration-200 min-w-[52px]",
              open ? "text-[#f97316]" : "text-gray-400 hover:text-[#f97316]"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200",
              open ? "bg-[#f97316]/10" : ""
            )}>
              <Menu className={cn("h-5 w-5", open ? "text-[#f97316]" : "text-gray-400")} />
            </div>
            <span className={cn(
              "text-[9px] font-semibold tracking-wide uppercase leading-none",
              open ? "text-[#f97316]" : "text-gray-400"
            )}>
              More
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};

interface DashboardLayoutProps {
  role?: AppRole;
  title?: string;
  children: ReactNode;
}

export const DashboardLayout = ({ role: propRole, title, children }: DashboardLayoutProps) => {
  const { user, role: authRole, signOut } = useAuth();
  const role = propRole || authRole || "student";
  const router = useRouter();
  const pathname = usePathname() || "";
  const { announcements, users } = useAppData();

  const currentUserData = users.find((item) => item.id === user?.id);
  const fullName = currentUserData?.full_name || user?.full_name || user?.email?.split("@")[0] || "User";
  const userPhoto = currentUserData?.profilePhoto || user?.profilePhoto || null;
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  const getPhotoUrl = (path: string | null) => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("data:")) return path;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
    return apiBase ? `${apiBase.replace("/api", "")}${cleanPath}` : cleanPath;
  };

  const handleSignOut = async () => {
    await signOut();
    if (role === "admin") router.push("/admin");
    else if (role === "teacher") router.push("/teacher");
    else if (role === "parent") router.push("/?role=parent");
    else router.push("/");
  };

  const hasNews = (announcements || []).length > 0;

  // Bell nav target per role
  const newsUrl = role === "student"
    ? "/dashboard/news"
    : role === "teacher"
    ? "/teacher/announcements"
    : role === "parent"
    ? "/parent/dashboard"
    : "/admin/announcements";

  // Derive title from path if not given
  const items = navByRole[role];
  const current = items.find((i) => pathname === i.url) ||
                  items.find((i) => !i.url.endsWith("/dashboard") && i.url !== "/dashboard" && pathname.startsWith(i.url + "/"));
  const heading = title ?? current?.title ?? "Dashboard";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-secondary/30">
        <AppSidebar role={role} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3 min-w-0">
              {/* Desktop sidebar trigger */}
              <SidebarTrigger className="text-muted-foreground hover:text-foreground hidden md:flex" />
              {/* Mobile logo */}
              <button
                className="md:hidden"
                onClick={() => router.push(role === "student" ? "/dashboard" : role === "teacher" ? "/teacher/dashboard" : role === "parent" ? "/parent/dashboard" : "/admin/dashboard")}
              >
                <img src="/favicon.ico" alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display font-semibold text-lg truncate">{heading}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => router.push(newsUrl)}
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {hasNews && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-secondary rounded-lg p-1 pr-3 transition-smooth">
                    <Avatar className="h-8 w-8">
                      {userPhoto && <AvatarImage src={getPhotoUrl(userPhoto)} alt={fullName} className="object-cover" />}
                      <AvatarFallback className="bg-primary-soft text-primary text-xs font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-medium leading-none">{fullName}</div>
                      <div className="text-xs text-muted-foreground capitalize mt-0.5">{role}</div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="text-sm font-medium">{fullName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{user?.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {role === "student" && (
                    <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
                      <UserCircle className="h-4 w-4 mr-2" /> My Profile
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          {/* Extra bottom padding on mobile so content doesn't hide behind bottom nav */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in pb-24 md:pb-8">
            <div className="max-w-7xl mx-auto w-full">{children}</div>
          </main>
        </div>
      </div>
      {/* Mobile bottom nav — all roles */}
      <MobileBottomNav role={role} />
    </SidebarProvider>
  );
};
