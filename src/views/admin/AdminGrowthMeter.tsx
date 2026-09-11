"use client";

import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts";
import { TrendingUp, User, Award, Percent, BookOpen, ChevronRight, Activity } from "lucide-react";
import { useAppData } from "@/hooks/useAppData";

const AdminGrowthMeter = () => {
  const { users, results } = useAppData();
  const students = users.filter((u) => u.role === "student");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || "");

  const activeStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  // Real enrollment growth: group real users by month of created_at
  const enrollmentGrowthData = useMemo(() => {
    const monthMap: Record<string, number> = {};
    const allStudents = users.filter(u => u.role === "student");
    allStudents.forEach(u => {
      if (!u.created_at) return;
      const d = new Date(u.created_at);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      monthMap[key] = (monthMap[key] || 0) + 1;
    });
    // Build cumulative sorted array
    const sorted = Object.entries(monthMap).sort((a, b) => {
      const da = new Date(a[0]);
      const db = new Date(b[0]);
      return da.getTime() - db.getTime();
    });
    let cumulative = 0;
    return sorted.map(([month, count]) => {
      cumulative += count;
      return { month, students: cumulative };
    });
  }, [users]);

  // Real subject averages: compute from actual results
  const subjectAverageData = useMemo(() => {
    const subjectMap: Record<string, { total: number; count: number }> = {};
    (results || []).forEach((r: any) => {
      if (!r.subject) return;
      const pct = Math.round((r.score / (r.maxScore || 100)) * 100);
      if (!subjectMap[r.subject]) subjectMap[r.subject] = { total: 0, count: 0 };
      subjectMap[r.subject].total += pct;
      subjectMap[r.subject].count += 1;
    });
    return Object.entries(subjectMap).map(([subject, { total, count }]) => ({
      subject,
      avgScore: Math.round(total / count),
    }));
  }, [results]);

  // Student growth: only real results, no fallback demo data
  const studentGrowthData = useMemo(() => {
    return (results || [])
      .filter((r: any) => r.studentId === selectedStudentId)
      .sort((a: any, b: any) => new Date(a.date || "").getTime() - new Date(b.date || "").getTime())
      .map((r: any, index: number) => ({
        testName: r.examType || `Test ${index + 1}`,
        percentage: Math.round((r.score / (r.maxScore || 100)) * 100),
        score: r.score,
        maxScore: r.maxScore,
        subject: r.subject,
      }));
  }, [results, selectedStudentId]);

  // Calculations for active student
  const growthMetrics = useMemo(() => {
    if (studentGrowthData.length === 0) return { start: 0, latest: 0, delta: 0, assessment: "No records" };
    const start = studentGrowthData[0].percentage;
    const latest = studentGrowthData[studentGrowthData.length - 1].percentage;
    const delta = latest - start;

    let assessment = "Consistent";
    if (delta > 10) assessment = "Excellent Progress (High Growth)";
    else if (delta > 3) assessment = "Moderate Growth (Improving)";
    else if (delta < 0) assessment = "Needs Attention (Down-trending)";

    return { start, latest, delta, assessment };
  }, [studentGrowthData]);

  return (
    <DashboardLayout role="admin" title="Student Growth Meter">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold">Student Growth Meter</h2>
        <p className="text-muted-foreground mt-1">Analyze institution-wide academic indicators and deep-dive into individual student progress</p>
      </div>

      {/* Global Indicators Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Enrollment progress area chart */}
        <Card className="p-5 shadow-card border-border/60">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-foreground">Total Enrollment Growth</h3>
              <p className="text-xs text-muted-foreground">Student onboarding trend this year</p>
            </div>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="h-[200px] w-full">
            {enrollmentGrowthData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No student enrollment data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={enrollmentGrowthData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="students" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#growthColor)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Subject averages bar chart */}
        <Card className="p-5 shadow-card border-border/60">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-foreground">Subject Score Benchmarks</h3>
              <p className="text-xs text-muted-foreground">Average mock assessment score by subject</p>
            </div>
            <BookOpen className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="h-[200px] w-full">
            {subjectAverageData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No result data yet to compute subject averages.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectAverageData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="subject" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="avgScore" fill="#818cf8" radius={[4, 4, 0, 0]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Individual Student Growth Analyzer */}
      <Card className="p-6 shadow-card border-border/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-border/60 pb-6">
          <div>
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" /> Student Performance Analyzer
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Select a student below to display their personal academic metrics trajectory</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Select Student:</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue placeholder="Choose student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.full_name} ({student.course || "8th"} Grade)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeStudent ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Info and KPI Badges */}
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-muted/20 rounded-2xl border border-border/60 flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">{activeStudent.full_name}</h4>
                  <span className="text-xs text-muted-foreground">{activeStudent.email}</span>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20 flex flex-col justify-between min-h-[90px]">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Latest Score</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <h5 className="font-display text-2xl font-bold text-foreground">{growthMetrics.latest}%</h5>
                    <Award className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>

                <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20 flex flex-col justify-between min-h-[90px]">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Net Growth</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <h5 className={`font-display text-2xl font-bold text-foreground ${growthMetrics.delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {growthMetrics.delta >= 0 ? `+${growthMetrics.delta}` : growthMetrics.delta}%
                    </h5>
                    <Percent className="h-4.5 w-4.5 text-indigo-500" />
                  </div>
                </div>
              </div>

              {/* Evaluation Card */}
              <div className="p-4 bg-secondary/50 rounded-xl border border-border/60 flex-1 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Academic Assessment</span>
                <p className="font-semibold text-sm text-foreground mt-1 flex items-center gap-1">
                  <ChevronRight className="h-4 w-4 text-indigo-500 shrink-0" />
                  {growthMetrics.assessment}
                </p>
                <span className="text-xs text-muted-foreground mt-2 block leading-relaxed">
                  Based on mock assessments taken during the current semester, demonstrating progression trajectory from {growthMetrics.start}% to {growthMetrics.latest}%.
                </span>
              </div>
            </div>

            {/* Trajectory line chart */}
            <div className="lg:col-span-2 flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">Performance Trajectory (% score over time)</span>
              <div className="h-[280px] w-full bg-muted/10 p-3 rounded-2xl border border-border/40">
                {studentGrowthData.length < 2 ? (
                  <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                    <TrendingUp className="h-8 w-8 opacity-20" />
                    {studentGrowthData.length === 0
                      ? "No results recorded for this student yet."
                      : "Need at least 2 results to show a trajectory."}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={studentGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="testName" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} />
                      <Tooltip formatter={(value: any, name: any, props: any) => [`${value}%`, `Percentage (${props.payload.subject})`]} />
                      <Line type="monotone" dataKey="percentage" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center text-muted-foreground text-sm">
            Please register students first to use the individual growth tracker.
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
};

export default AdminGrowthMeter;
