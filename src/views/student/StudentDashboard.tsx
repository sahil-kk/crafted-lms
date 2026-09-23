"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/hooks/useAuth";
import { useAppData, ResultObj, TimetableObj } from "@/hooks/useAppData";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  FileText, TrendingUp, CalendarDays, Clock, BookOpen,
  Trophy, Star, ChevronRight, Megaphone, CreditCard
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const StudentDashboard = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { exams, announcements, results, timetables, users, payments } = useAppData();
  const currentStudent = users.find((item) => item.id === user?.id || (user?.studentId && item.studentId === user.studentId) || (user?.email && item.email?.toLowerCase() === user.email.toLowerCase()));

  const validStudentIds = [user?.id, user?.studentId, (user as any)?._id].filter(Boolean).map(String);
  const pendingFees = (payments || []).filter(
    (p) => validStudentIds.includes(String(p.studentId)) && p.status !== "paid"
  );
  const totalPendingAmount = pendingFees.reduce((acc, p) => acc + p.amount, 0);

  const [calDate, setCalDate] = useState<Date | undefined>(new Date());

  // Real data derivations
  const myResults = (results || []).filter((r: ResultObj) => r.studentId === user?.id);
  const avgScore =
    myResults.length > 0
      ? Math.round(
        (myResults.reduce((acc, r) => acc + r.score / (r.maxScore || 100), 0) / myResults.length) * 100
      )
      : null;

  const currentStudentId = user?.id || (user as any)?._id || (user as any)?.studentId;
  const myExams = (exams || []).filter((e: any) => {
    if (!e.studentId || e.studentId === "none" || e.studentId === "") return true;
    return e.studentId === currentStudentId || e.studentId === user?.id || e.studentId === (user as any)?.studentId;
  });

  const upcomingExams = myExams
    .filter((e: any) => e.starts_at && new Date(e.starts_at) >= new Date())
    .sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 5);

  const myTimetable = (timetables || [])
    .filter((t: TimetableObj) => !t.studentId || t.studentId === user?.id)
    .sort((a: TimetableObj, b: TimetableObj) => {
      const ai = DAY_ORDER.indexOf(a.day);
      const bi = DAY_ORDER.indexOf(b.day);
      return ai - bi;
    });

  const displayName = currentStudent?.full_name || user?.full_name || user?.email?.split("@")[0] || "Student";
  const profilePhoto = currentStudent?.profilePhoto || user?.profilePhoto || null;
  const studentId = currentStudent?.studentId || (user as any)?.studentId || currentStudent?.id || user?.id || "------";
  const fullName = displayName;
  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Latest exam marks for display
  const recentMarks = [...myResults].slice(0, 6);

  return (
    <DashboardLayout role="student">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">

        {/* ── LEFT COLUMN ── */}
        <div className="xl:col-span-8 flex flex-col gap-4 sm:gap-6 min-w-0">

          {/* Welcome Banner with Photo + Student ID */}
          <div
            className="relative overflow-hidden rounded-2xl min-h-[164px] sm:min-h-[190px] px-4 sm:px-6 py-5 sm:py-6"
            style={{ background: "linear-gradient(120deg, #f97316 0%, #f97316 60%, #f97316 100%)" }}
          >
            <div className="absolute inset-0 z-[5] bg-[linear-gradient(to_right,rgba(249,115,22,0.95)_0%,rgba(249,115,22,0.86)_50%,rgba(249,115,22,0.18)_100%)] sm:bg-[linear-gradient(to_right,rgba(249,115,22,0.96)_0%,rgba(249,115,22,0.82)_46%,rgba(249,115,22,0.06)_100%)]" />

            {/* Left: Avatar + Info — width-capped so image never overlaps */}
            <div className="relative z-10 flex h-full min-h-[124px] items-center gap-3 sm:gap-5 pr-[112px] sm:pr-[190px] md:pr-[240px] min-w-0">
              {/* Avatar */}
              <div className="shrink-0">
                <div
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-4 border-white/40 shadow-xl flex items-center justify-center text-white font-bold overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", fontSize: "clamp(18px,5vw,30px)" }}
                >
                  {profilePhoto ? (
                    <img src={profilePhoto} alt={fullName} className="h-full w-full object-cover" />
                  ) : (
                    initials || "S"
                  )}
                </div>
              </div>
              {/* Name + ID */}
              <div className="min-w-0 flex-1 max-w-[440px]">
                <h2 className="font-display font-bold text-white leading-tight truncate text-[18px] sm:text-2xl lg:text-3xl">
                  {fullName}
                </h2>
                <p className="text-white/85 mt-1 font-medium tracking-wide text-xs sm:text-sm">
                  ID: <span className="text-white font-bold">{studentId}</span>
                </p>
                <p className="text-white/75 mt-1.5 line-clamp-2 text-[11px] sm:text-xs max-w-[28rem]">
                  {upcomingExams.length > 0
                    ? `${upcomingExams.length} upcoming exam${upcomingExams.length > 1 ? "s" : ""} scheduled`
                    : announcements?.[0]?.title || "You're all caught up!"}
                </p>
              </div>
            </div>

            {/* Gradient fade — protects text from image bleed-in */}
            {/* Decorative illustration — always visible, constrained to right zone */}
            <div className="absolute right-0 top-0 bottom-0 flex items-end justify-end opacity-95 pointer-events-none select-none z-[4]">
              <img
                src="/student_banner.png"
                alt=""
                className="h-full max-h-[150px] sm:max-h-[210px] w-[128px] sm:w-[220px] md:w-[270px] object-cover sm:object-contain object-right-bottom drop-shadow-lg"
              />
            </div>

            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-28 sm:w-36 h-28 sm:h-36 rounded-full bg-white/10 pointer-events-none z-[3]" />
            <div className="absolute -bottom-10 right-20 w-20 sm:w-28 h-20 sm:h-28 rounded-full bg-white/10 pointer-events-none z-[3]" />
          </div>

          {/* Pending Fee Reminder Banner (if any) */}
          {pendingFees.length > 0 && (
            <Card className="p-4 bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f97316] text-white flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">
                    Tuition Fee Due: ₹{totalPendingAmount.toLocaleString("en-IN")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You have {pendingFees.length} pending fee invoice{pendingFees.length > 1 ? "s" : ""}. Pay easily online via Razorpay.
                  </p>
                </div>
              </div>
              <Button
                variant="hero"
                size="sm"
                className="text-xs shrink-0 gap-1.5 w-full sm:w-auto"
                onClick={() => router.push("/dashboard/payments")}
              >
                Pay Fees Now <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Card>
          )}

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: "Avg Score", value: avgScore !== null ? `${avgScore}%` : "—", icon: Trophy, color: "#f97316" },
              { label: "Exams", value: myExams.length, icon: FileText, color: "#6366f1" },
              { label: "Classes", value: myTimetable.length, icon: CalendarDays, color: "#10b981" },
            ].map((stat) => (
              <Card key={stat.label} className="min-h-[74px] p-3 sm:p-4 shadow-card border-border/60 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-3 text-center sm:text-left">
                <div
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${stat.color}18` }}
                >
                  <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: stat.color }} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-base sm:text-lg text-foreground leading-none truncate">{stat.value}</div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-tight">{stat.label}</div>
                </div>
              </Card>
            ))}
          </div>

          {/* Upcoming Exams */}
          <Card className="shadow-card border-border/60">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 pt-5 pb-4 border-b border-border/60">
              <h3 className="font-display font-bold text-base sm:text-lg text-foreground">Upcoming Exams</h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 shrink-0"
                style={{ color: "#f97316" }}
                onClick={() => router.push("/dashboard/exams")}
              >
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="divide-y divide-border/40">
              {upcomingExams.length === 0 ? (
                <div className="px-4 sm:px-6 py-10 text-center text-sm text-muted-foreground">
                  No upcoming exams. Relax!
                </div>
              ) : (
                upcomingExams.map((exam: any) => (
                  <div
                    key={exam.id}
                    className="grid grid-cols-12 gap-3 px-4 sm:px-6 py-4 items-center hover:bg-secondary/40 transition-smooth group cursor-pointer"
                    onClick={() => router.push("/dashboard/exams")}
                  >
                    <div className="col-span-6 flex items-center gap-3">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "#f9731620" }}
                      >
                        <FileText className="h-4 w-4" style={{ color: "#f97316" }} />
                      </div>
                      <div className="font-medium text-sm text-foreground truncate">{exam.title}</div>
                    </div>
                    <div className="col-span-3">
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {exam.description || "Exam"}
                      </Badge>
                    </div>
                    <div className="col-span-3 text-sm text-muted-foreground text-right">
                      {exam.starts_at ? format(new Date(exam.starts_at), "MMM d") : "—"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Previous Exam Marks */}
          <Card className="shadow-card border-border/60">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/60">
              <div>
                <h3 className="font-display font-bold text-lg text-foreground">Previous Exam Marks</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Your recent assessment results</p>
              </div>
              <Star className="h-5 w-5" style={{ color: "#f97316" }} />
            </div>
            {recentMarks.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                No results yet. Your marks will appear here after exams.
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="grid grid-cols-12 gap-2 px-6 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border/40">
                  <div className="col-span-4">Subject</div>
                  <div className="col-span-3">Type</div>
                  <div className="col-span-2 text-center">Score</div>
                  <div className="col-span-3 text-right">Grade</div>
                </div>
                <div className="divide-y divide-border/30">
                  {recentMarks.map((r: ResultObj, i) => {
                    const pct = Math.round((r.score / (r.maxScore || 100)) * 100);
                    const gradeColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
                    return (
                      <div key={r.id || i} className="grid grid-cols-12 gap-2 px-6 py-3.5 items-center hover:bg-secondary/30 transition-smooth">
                        <div className="col-span-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: "#f9731615" }}
                            >
                              <BookOpen className="h-3.5 w-3.5" style={{ color: "#f97316" }} />
                            </div>
                            <span className="text-sm font-medium text-foreground truncate">{r.subject}</span>
                          </div>
                        </div>
                        <div className="col-span-3">
                          <span className="text-xs text-muted-foreground capitalize">{r.examType || "—"}</span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="font-bold text-sm" style={{ color: "#f97316" }}>{r.score}</span>
                          <span className="text-xs text-muted-foreground">/{r.maxScore || 100}</span>
                        </div>
                        <div className="col-span-3 text-right">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                            style={{ background: gradeColor }}
                          >
                            {r.grade || `${pct}%`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Mini performance chart */}
                <div className="px-6 pt-2 pb-5">
                  <div className="h-24 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[...myResults].reverse().map(r => ({
                          name: r.subject || "Exam",
                          pct: Math.round((r.score / (r.maxScore || 100)) * 100)
                        }))}
                        margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="perfGrad2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                        <RechartsTooltip
                          contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                          formatter={(val: any) => [`${val}%`, "Score"]}
                        />
                        <Area
                          type="monotone" dataKey="pct" stroke="#f97316" strokeWidth={2}
                          fillOpacity={1} fill="url(#perfGrad2)"
                          dot={{ fill: "#f97316", r: 2.5 }} activeDot={{ r: 4.5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* Timetable Widget */}
          <Card className="shadow-card border-border/60">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/60">
              <div>
                <h3 className="font-display font-bold text-lg text-foreground">My Timetable</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Your weekly class schedule</p>
              </div>
              <CalendarDays className="h-5 w-5" style={{ color: "#f97316" }} />
            </div>
            {myTimetable.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                No timetable entries yet.
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {myTimetable.map((t: TimetableObj) => (
                  <div key={t._id || t.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-secondary/30 transition-smooth">
                    <div className="w-20 shrink-0">
                      <span
                        className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide text-white"
                        style={{ background: "#f97316" }}
                      >
                        {t.day?.slice(0, 3)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-20 shrink-0">
                      <Clock className="h-3 w-3" /> {t.time}
                    </div>
                    <div className="flex-1 font-medium text-sm text-foreground">{t.subject}</div>
                    <div className="text-xs text-muted-foreground hidden sm:block">{t.teacher}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="xl:col-span-4 flex flex-col gap-4 sm:gap-6 min-w-0">

          {/* Calendar */}
          <Card className="p-2 shadow-card border-border/60 overflow-hidden">
            <Calendar
              mode="single"
              selected={calDate}
              onSelect={setCalDate}
              className="w-full"
              classNames={{
                months: "w-full",
                month: "w-full",
                caption: "flex justify-between items-center px-3 py-2 mb-1",
                caption_label: "font-bold text-sm text-foreground",
                nav: "flex items-center gap-1",
                nav_button: "h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center transition-colors",
                nav_button_previous: "",
                nav_button_next: "",
                table: "w-full border-collapse",
                head_row: "flex justify-between mt-1",
                head_cell: "w-9 font-semibold text-[10px] uppercase text-center",
                row: "flex w-full justify-between mt-1",
                cell: "h-9 w-9 text-center p-0 flex items-center justify-center relative",
                day: "h-9 w-9 rounded-full hover:bg-[#f97316]/10 hover:text-[#f97316] transition-colors font-medium text-sm flex items-center justify-center",
                day_selected: "!bg-[#f97316] !text-white font-bold",
                day_today: "border border-primary text-primary font-bold",
                day_outside: "text-muted-foreground/30",
                day_disabled: "opacity-25",
              } as any}
            />
          </Card>

          {/* Announcements */}
          {announcements && announcements.length > 0 && (
            <Card className="shadow-card border-border/60">
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/60">
                <h3 className="font-display font-bold text-base text-foreground">Announcements</h3>
                <Megaphone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="divide-y divide-border/30">
                {announcements.slice(0, 3).map((ann) => (
                  <div key={ann.id} className="px-5 py-3.5">
                    <div className="font-semibold text-sm text-foreground line-clamp-1">{ann.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ann.body}</div>
                    {ann.created_at && (
                      <div className="text-[10px] text-muted-foreground/60 mt-1">
                        {format(new Date(ann.created_at), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Performance Summary */}
          <Card className="p-5 shadow-card border-border/60">
            <h3 className="font-display font-bold text-base text-foreground mb-4">Performance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg Score</span>
                <span className="font-bold" style={{ color: "#f97316" }}>
                  {avgScore !== null ? `${avgScore}%` : "No results"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Exams Taken</span>
                <span className="font-bold text-foreground">{myResults.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Best Score</span>
                <span className="font-bold text-green-600">
                  {myResults.length > 0
                    ? `${Math.max(...myResults.map(r => Math.round((r.score / (r.maxScore || 100)) * 100)))}%`
                    : "—"}
                </span>
              </div>
              {avgScore !== null && (
                <div className="mt-2">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${avgScore}%`, background: "linear-gradient(90deg, #f97316, #f97316)" }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 text-right">{avgScore}% overall</div>
                </div>
              )}
            </div>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
