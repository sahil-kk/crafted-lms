"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Clock, Calendar, CheckCircle2,
  ClipboardList, Dumbbell, BookOpen,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format, isFuture } from "date-fns";
import { useAppData } from "@/hooks/useAppData";

type ExamTab = "unit_test" | "practice" | "worksheet";

const TAB_CONFIG: { key: ExamTab; label: string; icon: any; color: string; description: string }[] = [
  {
    key: "unit_test",
    label: "Unit Test",
    icon: ClipboardList,
    color: "#6366f1",
    description: "Formal chapter-wise assessments",
  },
  {
    key: "practice",
    label: "Practice Session",
    icon: Dumbbell,
    color: "#10b981",
    description: "Self-study practice papers",
  },
  {
    key: "worksheet",
    label: "Worksheet",
    icon: BookOpen,
    color: "#f59e0b",
    description: "Topic-based exercise sheets",
  },
];

const StudentExams = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { exams, attempts, questions, isLoading } = useAppData();
  const [activeTab, setActiveTab] = useState<ExamTab>("unit_test");

  const currentStudentId = user?.id || (user as any)?._id || (user as any)?.studentId;

  // Filter exams that are broadcast to all or specifically targeted to this student
  const studentRows = exams.filter((exam: any) => {
    if (!exam.studentId || exam.studentId === "none" || exam.studentId === "") return true;
    return (
      exam.studentId === currentStudentId ||
      exam.studentId === user?.id ||
      exam.studentId === (user as any)?.studentId
    );
  });

  const attemptedIds = new Set(
    attempts
      .filter((a) => (a.student_id === user?.id || a.student_id === currentStudentId) && a.status === "submitted")
      .map((a) => a.exam_id)
  );

  const allRows = [...studentRows].sort((a, b) => {
    if (a.starts_at && b.starts_at) return a.starts_at.localeCompare(b.starts_at);
    if (a.created_at && b.created_at) return b.created_at.localeCompare(a.created_at);
    return 0;
  });

  // Filter by tab — map exam types
  const tabRows = allRows.filter((exam) => {
    const type = (exam.exam_type || exam.description || (exam as any).subject || "").toLowerCase();
    if (activeTab === "unit_test") return type.includes("unit") || type.includes("test") || type === "pdf" || type === "";
    if (activeTab === "practice") return type.includes("practice") || type.includes("session");
    if (activeTab === "worksheet") return type.includes("worksheet") || type.includes("sheet");
    return true;
  });

  // Upcoming exams (all types) for schedule section
  const upcomingAll = allRows
    .filter((e) => e.starts_at && isFuture(new Date(e.starts_at)))
    .slice(0, 6);

  const activeConfig = TAB_CONFIG.find((t) => t.key === activeTab)!;

  const openPdf = (pdfUrl?: string) => {
    if (!pdfUrl) return;
    if (pdfUrl.startsWith("http") || pdfUrl.startsWith("data:")) {
      window.open(pdfUrl, "_blank");
    } else {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api").replace("/api", "");
      window.open(`${apiBase}/uploads/${pdfUrl}`, "_blank");
    }
  };

  return (
    <DashboardLayout role="student">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold">Exams</h2>
        <p className="text-muted-foreground mt-1">Your assessments, practice sessions &amp; worksheets</p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap border ${
              activeTab === tab.key
                ? "text-white shadow-md border-transparent"
                : "bg-background border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
            style={activeTab === tab.key ? { background: tab.color } : {}}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === tab.key ? "bg-white/25 text-white" : "bg-secondary text-muted-foreground"
            }`}>
              {allRows.filter(e => {
                const type = (e.exam_type || e.description || (e as any).subject || "").toLowerCase();
                if (tab.key === "unit_test") return type.includes("unit") || type.includes("test") || type === "pdf" || type === "";
                if (tab.key === "practice") return type.includes("practice") || type.includes("session");
                if (tab.key === "worksheet") return type.includes("worksheet") || type.includes("sheet");
                return false;
              }).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {[1, 2].map((n) => (
            <Card key={n} className="p-6 shadow-card border-border/60 animate-pulse space-y-4">
              <div className="flex justify-between">
                <div className="h-10 w-10 bg-secondary rounded-xl" />
                <div className="h-5 w-20 bg-secondary rounded-full" />
              </div>
              <div className="h-6 w-3/4 bg-secondary rounded" />
              <div className="h-4 w-1/2 bg-secondary rounded" />
              <div className="h-9 bg-secondary rounded mt-4" />
            </Card>
          ))}
        </div>
      ) : tabRows.length === 0 ? (
        <Card className="p-12 text-center shadow-card border-border/60 mb-6">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: `${activeConfig.color}18` }}
          >
            <activeConfig.icon className="h-6 w-6" style={{ color: activeConfig.color }} />
          </div>
          <h3 className="font-display font-semibold text-lg">No {activeConfig.label}s yet</h3>
          <p className="text-sm text-muted-foreground mt-1">{activeConfig.description}. Check back later!</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {tabRows.map((exam) => {
            const examId = exam.id || (exam as any)._id;
            const attempted = attemptedIds.has(examId);
            const upcoming = exam.starts_at ? isFuture(new Date(exam.starts_at)) : false;
            const qFromHook = questions.filter((question) => question.exam_id === examId).length;
            const qFromExam = (exam as any).questions?.length || 0;
            const questionCount = Math.max(qFromHook, qFromExam);

            return (
              <Card
                key={examId}
                className="p-6 shadow-card hover:shadow-elevated transition-smooth border-border/60 relative overflow-hidden"
              >
                {/* Status strip */}
                <div
                  className="absolute top-0 left-0 w-1 h-full rounded-l-lg"
                  style={{ background: attempted ? "#10b981" : activeConfig.color }}
                />

                <div className="flex items-start justify-between gap-4 mb-3">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${activeConfig.color}18` }}
                  >
                    <activeConfig.icon className="h-5 w-5" style={{ color: activeConfig.color }} />
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {attempted && (
                      <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                      </Badge>
                    )}
                    {!attempted && upcoming && (
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">
                        <AlertCircle className="h-3 w-3 mr-1" /> Upcoming
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {activeConfig.label}
                    </Badge>
                  </div>
                </div>

                <h3 className="font-display font-semibold text-lg leading-snug">{exam.title}</h3>
                {(exam.description || (exam as any).subject) && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{exam.description || (exam as any).subject}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4">
                  {exam.duration_minutes && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> {exam.duration_minutes} min
                    </div>
                  )}
                  {exam.starts_at && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(exam.starts_at), "MMM d, yyyy")}
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {questionCount > 0 && (
                    <Button
                      variant="hero"
                      className="w-full text-sm gap-2"
                      onClick={() => router.push(`/dashboard/exams/${examId}`)}
                    >
                      <ClipboardList className="h-4 w-4" />
                      {attempted ? "Review / Retake Exam" : "Start Exam"}
                    </Button>
                  )}
                  {exam.pdf && (
                    <Button
                      variant="outline"
                      className="w-full text-sm gap-2"
                      onClick={() => openPdf(exam.pdf)}
                    >
                      <FileText className="h-4 w-4" style={{ color: "#f97316" }} />
                      View Question Paper (PDF)
                    </Button>
                  )}
                  {!exam.pdf && questionCount === 0 && (
                    <div className="rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                      Questions are not published yet.
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Upcoming Exam Schedule ── */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-xl">Upcoming Exam Schedule</h3>
          <Badge variant="secondary" className="text-xs">{upcomingAll.length} upcoming</Badge>
        </div>

        {upcomingAll.length === 0 ? (
          <Card className="p-8 text-center shadow-card border-border/60">
            <div className="text-2xl mb-2">🎉</div>
            <p className="text-sm text-muted-foreground">No upcoming exams scheduled. Enjoy the break!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingAll.map((exam, idx) => {
              const daysLeft = exam.starts_at
                ? Math.ceil((new Date(exam.starts_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <Card
                  key={exam.id}
                  className="px-5 py-4 shadow-card border-border/60 flex items-center gap-4 hover:shadow-elevated transition-smooth"
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                      style={{ background: "linear-gradient(135deg, #f97316, #f97316)" }}
                    >
                      {idx + 1}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">{exam.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {exam.description || "General Assessment"}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {exam.starts_at && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(exam.starts_at), "MMM d, yyyy")}
                      </div>
                    )}
                    {daysLeft !== null && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{
                          background: daysLeft <= 3 ? "#ef4444" : daysLeft <= 7 ? "#f59e0b" : "#10b981",
                        }}
                      >
                        {daysLeft === 0 ? "Today!" : `${daysLeft}d left`}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentExams;
