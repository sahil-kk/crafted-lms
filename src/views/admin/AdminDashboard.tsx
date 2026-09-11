"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { 
  Users, GraduationCap, ClipboardList, Video, Database, Radio, Activity, Award,
  UserCheck, FileText, GraduationCap as TermIcon, FileSpreadsheet, BookOpen, TrendingUp, Settings, ChevronRight, MessageSquare
} from "lucide-react";
import { useAppData } from "@/hooks/useAppData";

// Beautiful Animated Count-Up component
const AnimatedNumber = ({ value }: { value: number }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end <= 0) {
      setCurrent(0);
      return;
    }
    const duration = 800;
    const stepTime = Math.abs(Math.floor(duration / end));
    const timer = setInterval(() => {
      start += 1;
      setCurrent(start);
      if (start >= end) {
        clearInterval(timer);
      }
    }, Math.max(stepTime, 15));

    return () => clearInterval(timer);
  }, [value]);

  return <span>{current}</span>;
};

const AdminDashboard = () => {
  const router = useRouter();
  const { users, courses, announcements, recordedClasses: classes, exams, results } = useAppData();
  const totalStudents = users.filter((u) => u.role === "student").length;
  const totalTeachers = users.filter((u) => u.role === "teacher").length;

  const scaledStats = {
    students: totalStudents,
    teachers: totalTeachers,
    classes: classes?.length || 0,
    exams: exams?.length || 0,
  };

  // Real computed metrics
  const totalResults = (results as any[])?.length || 0;
  const totalCourses = courses?.length || 0;
  const totalAnnouncements = announcements?.length || 0;

  // Color theme cards matching user's reference image
  const dashboardCards = [
    {
      title: "Attendance",
      description: "Mark daily attendance for your classes",
      icon: UserCheck,
      path: "/admin/timetable",
      bgClass: "bg-[#f0f5ff] hover:bg-[#e4eeff]",
      iconBg: "bg-[#2563eb]",
      iconColor: "text-white",
      borderColor: "border-blue-200"
    },
    {
      title: "Daily Viva (DV)",
      description: "Conduct and manage daily viva assessments",
      icon: FileText,
      path: "/admin/exams",
      bgClass: "bg-[#fdf2f8] hover:bg-[#fbe4f1]",
      iconBg: "bg-[#db2777]",
      iconColor: "text-white",
      borderColor: "border-pink-200"
    },
    {
      title: "Unit Test (UT)",
      description: "Create and evaluate unit tests",
      icon: ClipboardList,
      path: "/admin/exams",
      bgClass: "bg-[#f8fafc] hover:bg-[#f1f5f9]",
      iconBg: "bg-[#475569]",
      iconColor: "text-white",
      borderColor: "border-slate-200"
    },
    {
      title: "Term Exam (SA)",
      description: "Summative Assessment entry and reports",
      icon: TermIcon,
      path: "/admin/results",
      bgClass: "bg-[#f5f3ff] hover:bg-[#ede9fe]",
      iconBg: "bg-[#7c3aed]",
      iconColor: "text-white",
      borderColor: "border-purple-200"
    },
    {
      title: "FA Entry",
      description: "Formative Assessment marks entry",
      icon: FileSpreadsheet,
      path: "/admin/results",
      bgClass: "bg-[#ecfeff] hover:bg-[#d0fbe0]",
      iconBg: "bg-[#0891b2]",
      iconColor: "text-white",
      borderColor: "border-cyan-200"
    },
    {
      title: "Practice Entry",
      description: "Track student practice sessions",
      icon: BookOpen,
      path: "/admin/courses",
      bgClass: "bg-[#f0fdf4] hover:bg-[#dcfce7]",
      iconBg: "bg-[#16a34a]",
      iconColor: "text-white",
      borderColor: "border-green-200"
    },
    {
      title: "Student Growth",
      description: "Monitor student growth indicators",
      icon: TrendingUp,
      path: "/admin/growth-meter",
      bgClass: "bg-[#fef2f2] hover:bg-[#fee2e2]",
      iconBg: "bg-[#dc2626]",
      iconColor: "text-white",
      borderColor: "border-red-200"
    },
    {
      title: "Parent Controls",
      description: "Monitor messages and parent portal settings",
      icon: MessageSquare,
      path: "/admin/parent-controls",
      bgClass: "bg-[#f9731615] hover:bg-[#f9731625]",
      iconBg: "bg-[#f97316]",
      iconColor: "text-white",
      borderColor: "border-[#f97316]/30"
    },
    {
      title: "AST Management",
      description: "Academic system tracking",
      icon: Settings,
      path: "/admin/settings",
      bgClass: "bg-[#faf5ff] hover:bg-[#f3e8ff]",
      iconBg: "bg-[#9333ea]",
      iconColor: "text-white",
      borderColor: "border-fuchsia-200"
    }
  ];

  return (
    <DashboardLayout role="admin" title="Admin Portal">
      {/* Top Banner section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display text-3xl font-bold">Admin Portal</h2>
          <p className="text-muted-foreground mt-1">Manage portal functions, growth metrics, and courses.</p>
        </div>
      </div>

      {/* Main Color Grid exactly matching User Screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {dashboardCards.map((card) => (
          <Card 
            key={card.title} 
            onClick={() => router.push(card.path)}
            className={`p-6 shadow-sm rounded-3xl border ${card.borderColor} ${card.bgClass} cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between min-h-[170px]`}
          >
            <div>
              {/* Icon Squircle Container */}
              <div className={`h-11 w-11 rounded-2xl ${card.iconBg} ${card.iconColor} flex items-center justify-center shadow-sm mb-4`}>
                <card.icon className="h-5.5 w-5.5" />
              </div>
              <h3 className="font-display font-bold text-lg text-foreground tracking-tight">{card.title}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{card.description}</p>
            </div>
            
            <div className="flex justify-end mt-4">
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
            </div>
          </Card>
        ))}
      </div>

      {/* Core Counter Metrics Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5 border-border/60 bg-card shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold"><AnimatedNumber value={scaledStats.students} /></div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Students Registered</div>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-border/60 bg-card shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold"><AnimatedNumber value={scaledStats.teachers} /></div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Tutor Staff</div>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-border/60 bg-card shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold"><AnimatedNumber value={scaledStats.classes} /></div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Video Chapters</div>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-border/60 bg-card shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold"><AnimatedNumber value={scaledStats.exams} /></div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Total Mock Tests</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Real Data Metrics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI Cards */}
        <div className="flex flex-col gap-4">
          <Card className="p-5 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Award className="h-5.5 w-5.5" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block">Results Entered</span>
                <h4 className="font-display text-xl font-bold"><AnimatedNumber value={totalResults} /></h4>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <Database className="h-5.5 w-5.5" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest block">Courses Created</span>
                <h4 className="font-display text-xl font-bold"><AnimatedNumber value={totalCourses} /></h4>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Radio className="h-5.5 w-5.5" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest block">Announcements</span>
                <h4 className="font-display text-xl font-bold"><AnimatedNumber value={totalAnnouncements} /></h4>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Announcements panel */}
        <Card className="lg:col-span-2 p-5 shadow-card border-border/60">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-sm">Recent Announcements</h3>
              <p className="text-[10px] text-muted-foreground">Latest notices posted on the portal</p>
            </div>
            <Activity className="h-4 w-4 text-indigo-500" />
          </div>
          {announcements && announcements.length > 0 ? (
            <div className="divide-y divide-border/40">
              {announcements.slice(0, 4).map((ann) => (
                <div key={ann.id} className="py-3">
                  <div className="font-semibold text-sm text-foreground line-clamp-1">{ann.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ann.body}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[120px] flex items-center justify-center text-sm text-muted-foreground">
              No announcements yet. Create one from the dashboard.
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
