"use client";

import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Grid, List, GraduationCap, Users, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppData, TimetableObj } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";

const StudentTimetable = () => {
  const { timetables } = useAppData();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filter timetables: show entries mapped to THIS student, student's BATCH, or GLOBAL
  const mySchedule = useMemo(() => {
    if (!timetables) return [];
    return timetables.filter((t: TimetableObj) => {
      // Global: no studentId and no batch
      const isGlobal = !t.studentId && !t.batch;
      // Batch match: t.batch matches student's batch
      const isBatchMatch = t.batch && user?.batch && t.batch.toLowerCase() === user.batch.toLowerCase();
      // Individual match: studentId matches student's ID/email
      const isIndividualMatch = t.studentId && (t.studentId === user?.id || t.studentId === user?.email);

      return isGlobal || isBatchMatch || isIndividualMatch;
    });
  }, [timetables, user]);

  // Color helper for subjects
  const getSubjectColor = (subject: string) => {
    const sub = subject.toLowerCase();
    if (sub.includes("math") || sub.includes("mat")) {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
    if (sub.includes("phys") || sub.includes("phy")) {
      return "bg-indigo-50 text-indigo-700 border border-indigo-200";
    }
    if (sub.includes("chem") || sub.includes("che")) {
      return "bg-amber-50 text-amber-700 border border-amber-200";
    }
    if (sub.includes("biol") || sub.includes("bio")) {
      return "bg-rose-50 text-rose-700 border border-rose-200";
    }
    return "bg-slate-50 text-slate-700 border border-slate-200";
  };

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <DashboardLayout role="student" title="My Timetable">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold">My Timetable</h2>
          <p className="text-muted-foreground mt-1">
            Your weekly academic schedule for <strong className="text-primary font-semibold">{user?.batch || "Batch 1"}</strong>
          </p>
        </div>
        <div className="flex bg-muted p-1 rounded-lg">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-8 px-3"
          >
            <Grid className="h-4 w-4 mr-1.5" /> Grid View
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="h-8 px-3"
          >
            <List className="h-4 w-4 mr-1.5" /> Table View
          </Button>
        </div>
      </div>

      {mySchedule.length === 0 ? (
        <Card className="p-16 text-center border-border/60 shadow-card">
          <div className="h-14 w-14 rounded-2xl bg-primary-soft flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">No classes scheduled yet for your batch.</p>
        </Card>
      ) : viewMode === "grid" ? (
        /* Visual Schedule Grid View */
        <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-7 gap-4">
          {daysOfWeek.map((day) => {
            const dayPeriods = mySchedule.filter((t) => t.day === day);
            return (
              <div key={day} className="flex flex-col gap-3">
                {/* Day Header */}
                <div className="bg-primary/5 text-center py-2 rounded-lg border border-primary/10">
                  <span className="font-display font-bold text-sm text-foreground">{day}</span>
                  <span className="block text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">{dayPeriods.length} Periods</span>
                </div>

                {/* Period Cards */}
                <div className="flex flex-col gap-2.5 flex-1 min-h-[200px] bg-muted/20 p-2 rounded-xl border border-dashed border-border/40">
                  {dayPeriods.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-8">
                      <span className="text-[10px] text-muted-foreground font-medium italic">No classes</span>
                    </div>
                  ) : (
                    dayPeriods.map((period: TimetableObj) => (
                      <div
                        key={period._id || period.id}
                        className={`p-3 rounded-lg shadow-sm flex flex-col gap-1.5 transition-all hover:shadow-md ${getSubjectColor(period.subject)}`}
                      >
                        <span className="font-bold text-xs uppercase tracking-tight line-clamp-2">{period.subject}</span>
                        
                        <div className="flex items-center gap-1 text-[10px] opacity-90 font-medium">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{period.time}</span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] opacity-90 font-medium">
                          <GraduationCap className="h-3 w-3 shrink-0" />
                          <span>{period.teacher}</span>
                        </div>

                        {period.batch && (
                          <div className="mt-1 self-start inline-flex items-center gap-0.5 bg-foreground/10 px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                            <Users className="h-2 w-2" />
                            <span>{period.batch}</span>
                          </div>
                        )}
                        {period.studentId && (
                          <div className="mt-1 self-start inline-flex items-center gap-0.5 bg-foreground/10 px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                            <User className="h-2 w-2" />
                            <span>Personal</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card className="p-4 shadow-card border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Time Block</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead className="text-right">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mySchedule.map((t: TimetableObj) => (
                <TableRow key={t._id || t.id}>
                  <TableCell className="font-semibold text-primary">{t.day}</TableCell>
                  <TableCell className="text-sm font-medium">{t.time}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-muted text-foreground">
                      {t.subject}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-foreground/80">{t.teacher}</TableCell>
                  <TableCell className="text-right">
                    {t.batch ? (
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                        {t.batch} Schedule
                      </span>
                    ) : t.studentId ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                        Personal
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Global / All</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </DashboardLayout>
  );
};

export default StudentTimetable;
