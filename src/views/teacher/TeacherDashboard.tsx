"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Users, Video, ClipboardList, BarChart3, TrendingUp, Presentation } from "lucide-react";
import { useAppData } from "@/hooks/useAppData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const TeacherDashboard = () => {
  const { users, recordedClasses: classes, exams, results, timetables } = useAppData();
  
  const studentCount = users.filter((u) => u.role === "student").length;
  
  const stats = [
    { label: "My Students", value: studentCount, icon: Users },
    { label: "Active Classes", value: classes?.length || 0, icon: Video },
    { label: "Targeted Exams", value: exams?.length || 0, icon: ClipboardList },
    { label: "Scores Published", value: results?.length || 0, icon: BarChart3 },
  ];

  // Derive simple graph data from results
  // In a real system, you'd aggregate scores over time. Here we just sort by date (if available) or by index
  const performanceData = (results || []).slice(0, 8).map((r, i) => ({
    name: r.subject || `Exam ${i+1}`,
    score: r.score,
    maxScore: r.maxScore,
    percent: Math.round((r.score / (r.maxScore || 100)) * 100)
  }));

  // Fallback visual data if they have no deployed results
  const renderData = performanceData.length > 0 ? performanceData : [
    { name: "No Data", percent: 0 },
    { name: "Yet", percent: 0 }
  ];

  const recentSchedules = (timetables || []).slice(0, 5);

  return (
    <DashboardLayout role="teacher">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold">Teacher Dashboard</h2>
          <p className="text-muted-foreground mt-1">Live metrics of your digital classroom</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 shadow-card border-border/60 hover:shadow-elevated transition-smooth">
            <div className="h-10 w-10 rounded-xl bg-primary-soft flex items-center justify-center mb-3">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="font-display text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Quick Action Banner for Class Register & Timetable */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs uppercase font-bold text-orange-100 tracking-wider">Daily Mentorship</span>
            <h3 className="text-lg font-black mt-0.5">Today's Class Register</h3>
            <p className="text-xs text-orange-100 mt-1 max-w-sm">
              Confirm your 1:1 sessions to update live topic coverage and your monthly payroll count.
            </p>
          </div>
          <a
            href="/teacher/register"
            className="px-4 py-2 rounded-xl bg-white text-orange-600 font-bold text-xs hover:bg-orange-50 transition-all shrink-0 ml-4 shadow-sm"
          >
            Open Register &rarr;
          </a>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-100 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">Weekly Schedule</span>
            <h3 className="text-lg font-black text-gray-900 mt-0.5">1:1 Mentorship Timetable</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              Manage your recurring 1.5 hr slots across Monday to Sunday for each assigned student.
            </p>
          </div>
          <a
            href="/teacher/weekly-timetable"
            className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-600 transition-all shrink-0 ml-4 shadow-sm"
          >
            Manage Slots &rarr;
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6 shadow-card border-border/60 h-full">
            <h3 className="font-display font-semibold mb-6 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Student Performance Trend
            </h3>
            {performanceData.length === 0 ? (
              <div className="h-64 flex items-center justify-center flex-col text-muted-foreground bg-secondary/20 rounded-xl">
                 <BarChart3 className="h-10 w-10 text-muted mb-2 opacity-30" />
                 <p className="text-sm">Publish results in the Results tab to populate graphs.</p>
              </div>
            ) : (
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={renderData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <defs>
                         <linearGradient id="colorPercent" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                       <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                       <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                       <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                       <Area type="monotone" dataKey="percent" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorPercent)" />
                     </AreaChart>
                   </ResponsiveContainer>
                </div>
            )}
          </Card>
        </div>

        <div>
          <Card className="p-6 shadow-card border-border/60 h-full">
            <h3 className="font-display font-semibold mb-6 flex items-center gap-2">
               <Presentation className="h-5 w-5 text-primary" /> Latest Schedules
            </h3>
            {recentSchedules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No timetables assigned yet.</p>
            ) : (
              <div className="space-y-4">
                {recentSchedules.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0 border-border/50">
                    <div>
                      <div className="font-medium text-sm text-foreground">{t.subject}</div>
                      <div className="text-xs text-muted-foreground">{t.day} • {t.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
