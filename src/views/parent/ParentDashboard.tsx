"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Shield,
  TrendingUp,
  UserCircle,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/apiClient";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ParentPortalData {
  student: any;
  results: any[];
  timetables: any[];
  exams: any[];
  recordedClasses: any[];
  teachers: any[];
  messages: any[];
}

const titleByPath: Record<string, string> = {
  "/parent/dashboard": "Parent Dashboard",
  "/parent/profile": "Student Profile",
  "/parent/results": "Exam Results",
  "/parent/growth": "Growth Meter",
  "/parent/exams": "Exams",
  "/parent/teachers": "Teachers",
};

const safeDate = (value: any) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const safeFormat = (value: any, pattern = "MMM d, yyyy") => format(safeDate(value), pattern);

const asArray = <T,>(value: T[] | undefined | null): T[] => Array.isArray(value) ? value : [];

const ParentDashboard = () => {
  const router = useRouter();
  const pathname = usePathname() || "";
  const { user } = useAuth();
  const appData = useAppData();
  const [portal, setPortal] = useState<ParentPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageForm, setMessageForm] = useState({ teacherId: "", subject: "", message: "" });

  useEffect(() => {
    let mounted = true;
    const loadPortal = async () => {
      setLoading(true);
      try {
        const data = await apiClient<ParentPortalData>("/parents/me");
        if (mounted) setPortal(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPortal();
    return () => {
      mounted = false;
    };
  }, []);

  const section = pathname.includes("/profile")
    ? "profile"
    : pathname.includes("/results")
    ? "results"
    : pathname.includes("/growth")
    ? "growth"
    : pathname.includes("/exams")
    ? "exams"
    : pathname.includes("/teachers")
    ? "teachers"
    : "dashboard";

  const linkedStudentId = portal?.student?._id || portal?.student?.id || user?.linkedStudentId;
  const appUsers = asArray(appData.users);
  const appResults = asArray(appData.results);
  const appExams = asArray(appData.exams);
  const appTimetables = asArray(appData.timetables);
  const appRecordedClasses = asArray(appData.recordedClasses);
  const student = portal?.student || appUsers.find((item) => item.id === linkedStudentId) || null;
  const results = asArray(portal?.results).length
    ? asArray(portal?.results)
    : appResults.filter((item) => item.studentId === linkedStudentId);
  const exams = asArray(portal?.exams).length
    ? asArray(portal?.exams)
    : appExams.filter((item) => {
        if (!item.studentId || item.studentId === "none" || item.studentId === "") return true;
        return item.studentId === linkedStudentId;
      });
  const timetables = asArray(portal?.timetables).length ? asArray(portal?.timetables) : appTimetables;
  const recordedClasses = asArray(portal?.recordedClasses).length ? asArray(portal?.recordedClasses) : appRecordedClasses;
  const teachers = asArray(portal?.teachers).length
    ? asArray(portal?.teachers)
    : appUsers.filter((item) => item.role === "teacher");
  const messages = asArray(portal?.messages);

  const childPayments = useMemo(() => {
    const validIds = [
      linkedStudentId,
      student?.id,
      student?._id,
      student?.studentId,
      user?.linkedStudentId,
    ]
      .filter(Boolean)
      .map(String);
    if (validIds.length === 0) return [];
    return asArray(appData.payments).filter((p: any) => validIds.includes(String(p.studentId)));
  }, [appData.payments, linkedStudentId, student, user]);

  const pendingChildDues = childPayments.filter((p: any) => p.status !== "paid");
  const totalPendingChildAmount = pendingChildDues.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      const saved = await apiClient<any>("/parents/messages", {
        method: "POST",
        body: JSON.stringify(messageForm),
      });
      setPortal((prev) => prev ? { ...prev, messages: [saved, ...(prev.messages || [])] } : prev);
      setMessageForm({ teacherId: "", subject: "", message: "" });
      toast.success("Message sent to teacher");
    } catch (err: any) {
      toast.error(err.message || "Could not send message");
    } finally {
      setSending(false);
    }
  };

  const rows = useMemo(() => {
    return [...results]
      .map((result) => ({
        id: result._id || result.id || `${result.subject}-${result.date}`,
        title: result.subject || "Exam",
        score: Number(result.score || 0),
        maxScore: Number(result.maxScore || result.max_score || 100),
        date: safeDate(result.date || result.createdAt || result.created_at).toISOString(),
        type: result.examType || result.exam_type || "Assessment",
        grade: result.grade,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [results]);

  const chartData = rows
    .slice()
    .reverse()
    .map((row) => ({
      label: safeFormat(row.date, "MMM d"),
      percent: Math.round((row.score / row.maxScore) * 100),
      subject: row.title,
    }));

  const avg = chartData.length
    ? Math.round(chartData.reduce((sum, item) => sum + item.percent, 0) / chartData.length)
    : 0;
  const best = chartData.length ? Math.max(...chartData.map((item) => item.percent)) : 0;
  const first = chartData[0]?.percent || 0;
  const latest = chartData[chartData.length - 1]?.percent || 0;
  const growth = chartData.length > 1 ? latest - first : 0;

  const upcomingExams = exams
    .filter((exam) => exam.starts_at || exam.date)
    .filter((exam) => safeDate(exam.starts_at || exam.date).getTime() >= Date.now())
    .sort((a, b) => safeDate(a.starts_at || a.date).getTime() - safeDate(b.starts_at || b.date).getTime());

  const fullName = student?.name || student?.full_name || "Linked Student";
  const studentId = student?.studentId || linkedStudentId || "Not assigned";
  const studentPhoto = student?.profilePhoto || student?.avatar_url || "";
  const initials = fullName.slice(0, 2).toUpperCase();

  const statCards = [
    { label: "Average", value: chartData.length ? `${avg}%` : "No data", icon: BarChart3, color: "#f97316" },
    { label: "Best Score", value: chartData.length ? `${best}%` : "No data", icon: Award, color: "#10b981" },
    { label: "Growth", value: chartData.length > 1 ? `${growth >= 0 ? "+" : ""}${growth}%` : "No data", icon: TrendingUp, color: "#6366f1" },
    { label: "Exams", value: rows.length, icon: ClipboardList, color: "#f59e0b" },
  ];

  return (
    <DashboardLayout role="parent" title={titleByPath[pathname] || "Parent Dashboard"}>
      <div className="space-y-6">
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-6"
          style={{ background: "linear-gradient(120deg, #f97316 0%, #f97316 62%, #f97316 100%)" }}
        >
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge className="bg-white/20 text-white border-white/20 hover:bg-white/20 mb-3">
                Parent View
              </Badge>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">{fullName}</h2>
              <p className="text-white/80 text-sm mt-1">
                {student?.course || "Course not set"} - {student?.batch || "Batch not set"} - ID: {studentId}
              </p>
            </div>
            <div className="rounded-2xl bg-white/16 border border-white/20 p-4 min-w-[220px]">
              <div className="text-white/70 text-[11px] uppercase font-bold">Overall Average</div>
              <div className="text-white font-display text-3xl font-bold">{chartData.length ? `${avg}%` : "--"}</div>
            </div>
          </div>
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
          <div className="absolute right-16 -bottom-16 h-32 w-32 rounded-full bg-white/10" />
        </div>

        {loading && (
          <Card className="p-4 text-sm text-muted-foreground border-border/60 shadow-card">
            Loading student data...
          </Card>
        )}

        {/* Pending Fee Reminder Banner for Parent */}
        {section === "dashboard" && pendingChildDues.length > 0 && (
          <Card className="p-4 bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#f97316] text-white flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-900">
                  Academic Tuition Fee Due: ₹{totalPendingChildAmount.toLocaleString("en-IN")}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  There are {pendingChildDues.length} pending fee invoice{pendingChildDues.length > 1 ? "s" : ""} for {student?.name || "your child"}. Pay securely online via Razorpay.
                </p>
              </div>
            </div>
            <Button
              variant="hero"
              size="sm"
              className="text-xs shrink-0 gap-1.5 w-full sm:w-auto"
              onClick={() => router.push("/parent/payments")}
            >
              Pay Fee Online
            </Button>
          </Card>
        )}

        {(section === "dashboard" || section === "growth" || section === "results") && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <Card key={stat.label} className="p-5 shadow-card border-border/60">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${stat.color}18` }}>
                  <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
                <div className="font-display text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </Card>
            ))}
          </div>
        )}

        {(section === "dashboard" || section === "profile") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-6 shadow-card border-border/60 text-center">
              <div
                className="h-28 w-28 rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-4xl border-4 border-white shadow-xl overflow-hidden"
                style={{ background: "linear-gradient(135deg, #f97316, #f97316)" }}
              >
                {studentPhoto ? (
                  <img src={studentPhoto} alt={fullName} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <h3 className="font-display font-bold text-xl mt-4">{fullName}</h3>
              <p className="text-sm text-muted-foreground">Student profile visible to parent</p>
              <Badge className="mt-3 bg-primary-soft text-primary border-0 hover:bg-primary-soft">Read only</Badge>
            </Card>

            <Card className="lg:col-span-2 p-6 shadow-card border-border/60">
              <h3 className="font-display font-bold text-lg mb-5 flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-primary" /> Student Profile
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Full Name", value: fullName, icon: UserCircle },
                  { label: "Student ID", value: studentId, icon: Shield },
                  { label: "Email", value: student?.email || "Not set", icon: Mail },
                  { label: "Phone", value: student?.phone || "Not set", icon: Phone },
                  { label: "Class / Course", value: student?.course || "Not set", icon: GraduationCap },
                  { label: "Batch", value: student?.batch || "Not set", icon: BookOpen },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-secondary/40 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground flex items-center gap-1.5">
                      <item.icon className="h-3.5 w-3.5" /> {item.label}
                    </div>
                    <div className="font-semibold text-sm mt-1 break-words">{item.value}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {(section === "dashboard" || section === "growth") && (
          <Card className="p-6 shadow-card border-border/60">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-display font-bold text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" /> Growth Meter
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Student performance trajectory across published exam results</p>
              </div>
              <Badge variant="secondary">{chartData.length} records</Badge>
            </div>

            {chartData.length === 0 ? (
              <div className="h-64 rounded-xl bg-secondary/40 flex items-center justify-center text-sm text-muted-foreground">
                Published results will appear here.
              </div>
            ) : (
              <div className="grid lg:grid-cols-4 gap-5">
                <div className="lg:col-span-3 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} />
                      <RechartsTooltip formatter={(value: any, _name: any, props: any) => [`${value}%`, props.payload.subject]} />
                      <Line type="monotone" dataKey="percent" stroke="#f97316" strokeWidth={3} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-border/60 p-4">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Latest Score</div>
                    <div className="font-display text-2xl font-bold text-primary">{latest}%</div>
                  </div>
                  <div className="rounded-xl border border-border/60 p-4">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Net Growth</div>
                    <div className={`font-display text-2xl font-bold ${growth >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {growth >= 0 ? "+" : ""}{growth}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 p-4">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Assessment</div>
                    <div className="font-semibold text-sm mt-1">
                      {growth > 10 ? "Excellent progress" : growth > 3 ? "Improving" : growth < 0 ? "Needs attention" : "Consistent"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {(section === "dashboard" || section === "results") && (
          <Card className="shadow-card border-border/60 overflow-hidden">
            <div className="p-6 border-b border-border/60">
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Exam Results
              </h3>
            </div>
            {rows.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">No exam results published yet.</div>
            ) : (
              <div className="divide-y divide-border/60">
                {rows.map((row) => {
                  const percent = Math.round((row.score / row.maxScore) * 100);
                  return (
                    <div key={row.id} className="p-5 hover:bg-secondary/40 transition-smooth">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-semibold truncate flex items-center gap-2">
                            {row.title}
                            {row.grade && <Badge className="bg-primary-soft text-primary border-0 hover:bg-primary-soft">{row.grade}</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {safeFormat(row.date)} - {row.type}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-display font-bold text-lg">{row.score}/{row.maxScore}</div>
                          <div className="text-xs text-primary">{percent}%</div>
                        </div>
                      </div>
                      <Progress value={percent} className="h-2 mt-3" />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {(section === "dashboard" || section === "exams") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 shadow-card border-border/60">
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" /> Exams
              </h3>
              {exams.length === 0 ? (
                <p className="text-sm text-muted-foreground">No exams available for this student.</p>
              ) : (
                <div className="space-y-3">
                  {exams.slice(0, section === "exams" ? exams.length : 5).map((exam) => (
                    <div key={exam._id || exam.id} className="rounded-xl border border-border/60 p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-sm">{exam.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {exam.subject || exam.description || "Assessment"}
                          {(exam.starts_at || exam.date) ? ` - ${safeFormat(exam.starts_at || exam.date)}` : ""}
                        </div>
                      </div>
                      <Badge variant="secondary">{exam.exam_type || "exam"}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 shadow-card border-border/60">
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" /> Schedule
              </h3>
              <div className="space-y-3">
                {timetables.slice(0, 5).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No timetable entries yet.</p>
                ) : timetables.slice(0, 5).map((item) => (
                  <div key={item._id || item.id} className="rounded-xl border border-border/60 p-3">
                    <div className="font-semibold text-sm">{item.subject}</div>
                    <div className="text-xs text-muted-foreground">{item.day} - {item.time}</div>
                    <div className="text-xs text-muted-foreground">{item.teacher || "Teacher"}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {section === "dashboard" && (
          <Card className="p-6 shadow-card border-border/60">
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Learning Summary
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-secondary/40 p-4">
                <div className="text-xs text-muted-foreground">Recorded Classes</div>
                <div className="font-display text-2xl font-bold">{recordedClasses.length}</div>
              </div>
              <div className="rounded-xl bg-secondary/40 p-4">
                <div className="text-xs text-muted-foreground">Upcoming Exams</div>
                <div className="font-display text-2xl font-bold">{upcomingExams.length}</div>
              </div>
              <div className="rounded-xl bg-secondary/40 p-4">
                <div className="text-xs text-muted-foreground">Completed Results</div>
                <div className="font-display text-2xl font-bold">{rows.length}</div>
              </div>
            </div>
          </Card>
        )}

        {(section === "dashboard" || section === "teachers") && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 shadow-card border-border/60">
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" /> Interact With Teachers
              </h3>
              <form onSubmit={sendMessage} className="space-y-4">
                <div>
                  <Label>Teacher</Label>
                  <Select value={messageForm.teacherId} onValueChange={(teacherId) => setMessageForm((prev) => ({ ...prev, teacherId }))}>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher._id || teacher.id} value={(teacher._id || teacher.id)!}>
                          {teacher.name || teacher.full_name || teacher.email} {teacher.subject ? `- ${teacher.subject}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input
                    required
                    value={messageForm.subject}
                    onChange={(event) => setMessageForm((prev) => ({ ...prev, subject: event.target.value }))}
                    placeholder="Need an update on homework"
                  />
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea
                    required
                    value={messageForm.message}
                    onChange={(event) => setMessageForm((prev) => ({ ...prev, message: event.target.value }))}
                    placeholder="Write your message to the teacher"
                  />
                </div>
                <Button type="submit" variant="hero" className="w-full gap-2" disabled={sending || !messageForm.teacherId}>
                  <Send className="h-4 w-4" /> Send Message
                </Button>
              </form>
            </Card>

            <Card className="p-6 shadow-card border-border/60">
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" /> Message History
              </h3>
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Messages sent to teachers will appear here.</p>
                ) : messages.slice(0, 8).map((message) => (
                  <div key={message._id || message.id} className="rounded-xl border border-border/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-sm">{message.subject}</div>
                      <Badge className="bg-primary-soft text-primary hover:bg-primary-soft border-0">{message.status || "sent"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{message.message}</p>
                    {message.replies?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.replies.slice(-2).map((reply: any, index: number) => (
                          <div key={reply._id || index} className="rounded-lg bg-secondary/50 px-3 py-2">
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">
                              {reply.sender?.name || reply.senderRole || "Teacher"} replied
                            </div>
                            <p className="text-xs text-foreground mt-1">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      {message.teacher?.name || message.teacher?.email || "Teacher"}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ParentDashboard;
