"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { BarChart3, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format } from "date-fns";
import { useAppData, ResultObj } from "@/hooks/useAppData";

const StudentResults = () => {
  const { user } = useAuth();
  const { results, exams, attempts } = useAppData();
  
  // 1. Interactive mock results
  const mockAttempts = attempts
    .filter((attempt) => attempt.student_id === user?.id && attempt.status === "submitted")
    .map((attempt) => ({
      id: attempt.id,
      title: exams.find(e => e.id === attempt.exam_id)?.title || "Exam",
      score: attempt.score!,
      maxScore: attempt.max_score!,
      date: attempt.submitted_at || new Date().toISOString(),
      type: "Interactive MCQ"
    }));

  // 2. Officially published targeted backend results
  const officialResults = (results || [])
    .filter((r: ResultObj) => r.studentId === user?.id)
    .map((r: ResultObj) => ({
      id: r._id || r.id,
      title: r.subject || "Graded Exam",
      score: r.score,
      maxScore: r.maxScore,
      date: r.date || new Date().toISOString(),
      type: r.examType || "Targeted Paper",
      grade: r.grade,
      trend: r.trend
    }));

  // Merge both worlds sorted by latest
  const rows = [...officialResults, ...mockAttempts].sort((a, b) => b.date.localeCompare(a.date));

  const chartData = rows
    .map((row) => ({
      date: format(new Date(row.date), "MMM d"),
      percent: Math.round((row.score / row.maxScore) * 100),
      title: row.title,
    })).reverse(); // Oldest first for chart trend

  const avg = chartData.length ? Math.round(chartData.reduce((sum, item) => sum + item.percent, 0) / chartData.length) : 0;
  const best = chartData.length ? Math.max(...chartData.map((item) => item.percent)) : 0;

  return (
    <DashboardLayout role="student">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold">My Results</h2>
        <p className="text-muted-foreground mt-1">Track your performance securely tracked to your ID</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-5 shadow-card border-border/60">
          <div className="text-xs text-muted-foreground">Total exams</div>
          <div className="font-display text-2xl font-bold mt-1">{rows.length}</div>
        </Card>
        <Card className="p-5 shadow-card border-border/60">
          <div className="text-xs text-muted-foreground">Average</div>
          <div className="font-display text-2xl font-bold mt-1">{avg}%</div>
        </Card>
        <Card className="p-5 shadow-card border-border/60">
          <div className="text-xs text-muted-foreground">Best score</div>
          <div className="font-display text-2xl font-bold mt-1 text-primary">{best}%</div>
        </Card>
        <Card className="p-5 shadow-card border-border/60">
          <div className="text-xs text-muted-foreground">Trend</div>
          <div className="font-display text-2xl font-bold mt-1 flex items-center gap-1 text-success">
            <TrendingUp className="h-5 w-5" /> Up
          </div>
        </Card>
      </div>

      <Card className="p-6 shadow-card border-border/60 mb-6">
        <h3 className="font-display font-semibold mb-4">Performance over time</h3>
        {chartData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No graded results yet. Your chart will appear here.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Area type="monotone" dataKey="percent" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="shadow-card border-border/60 overflow-hidden">
        <div className="p-6 border-b border-border/60">
          <h3 className="font-display font-semibold">Published Report Cards</h3>
        </div>
        {rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary-soft flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">No targeted results have been pushed to you yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {rows.map((row) => (
              <div key={row.id} className="p-5 flex items-center justify-between gap-4 hover:bg-secondary/40 transition-smooth">
                <div className="min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {row.title}
                    {(row as any).grade && <span className="text-xs bg-primary-soft text-primary px-2 py-0.5 rounded-full font-bold ml-2">{(row as any).grade}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                    {format(new Date(row.date), "MMM d, yyyy")} • {row.type}
                  </div>
                </div>
                <div className="text-right shrink-0">
                    <div className="font-display font-bold text-lg">{row.score}/{row.maxScore}</div>
                    <div className="text-xs text-primary">{Math.round((row.score / row.maxScore) * 100)}%</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
};

export default StudentResults;
