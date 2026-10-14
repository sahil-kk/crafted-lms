"use client";

import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { CalendarDays, Clock, Grid, List, GraduationCap, Users, User, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAppData, TimetableObj } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { format, isSameDay } from "date-fns";

const StudentTimetable = () => {
  const { timetables } = useAppData();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"calendar" | "grid" | "table">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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

  // Selected date derivations for Calendar view
  const selectedDayName = selectedDate ? format(selectedDate, "EEEE") : format(new Date(), "EEEE");
  const selectedDayClasses = useMemo(() => {
    return mySchedule.filter((t) => t.day?.toLowerCase() === selectedDayName.toLowerCase());
  }, [mySchedule, selectedDayName]);

  const hasClassesOnDate = (date: Date) => {
    const dayName = format(date, "EEEE").toLowerCase();
    return mySchedule.some((t) => t.day?.toLowerCase() === dayName);
  };

  const isTodaySelected = isSameDay(selectedDate, new Date());

  return (
    <DashboardLayout role="student" title="My Timetable">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold">My Schedule & Calendar</h2>
          <p className="text-muted-foreground mt-1">
            Academic schedule & class timetable for <strong className="text-primary font-semibold">{user?.batch || "Batch 1"}</strong>
          </p>
        </div>
        <div className="flex bg-muted p-1 rounded-lg">
          <Button
            variant={viewMode === "calendar" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            className="h-8 px-3"
          >
            <CalendarIcon className="h-4 w-4 mr-1.5" /> Calendar
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-8 px-3"
          >
            <Grid className="h-4 w-4 mr-1.5" /> Week Grid
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="h-8 px-3"
          >
            <List className="h-4 w-4 mr-1.5" /> Table
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
      ) : viewMode === "calendar" ? (
        /* Minimal Clean Calendar View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Calendar Picker Card */}
          <Card className="lg:col-span-5 p-4 shadow-card border-border/60">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <h3 className="font-display font-bold text-sm text-foreground">Interactive Calendar</h3>
              </div>
              {!isTodaySelected && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-primary hover:bg-primary-soft px-2 font-semibold"
                  onClick={() => setSelectedDate(new Date())}
                >
                  Today
                </Button>
              )}
            </div>

            <CalendarWidget
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              className="w-full p-0"
              modifiers={{
                hasClasses: (date: Date) => hasClassesOnDate(date),
              }}
              modifiersClassNames={{
                hasClasses: "font-semibold",
              }}
              classNames={{
                months: "w-full",
                month: "w-full",
                caption: "flex justify-between items-center px-2 py-2 mb-2",
                caption_label: "font-bold text-sm text-foreground",
                nav: "flex items-center gap-1",
                nav_button: "h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center transition-colors",
                nav_button_previous: "",
                nav_button_next: "",
                table: "w-full border-collapse",
                head_row: "flex justify-between mt-1",
                head_cell: "w-9 font-semibold text-[11px] uppercase text-center text-muted-foreground",
                row: "flex w-full justify-between mt-1",
                cell: "h-9 w-9 text-center p-0 flex items-center justify-center relative",
                day: "h-9 w-9 rounded-full hover:bg-[#f97316]/10 hover:text-[#f97316] transition-colors font-medium text-sm flex items-center justify-center",
                day_selected: "!bg-[#f97316] !text-white font-bold shadow-sm",
                day_today: "border border-[#f97316] text-[#f97316] font-bold",
                day_outside: "text-muted-foreground/30",
                day_disabled: "opacity-25",
              } as any}
            />

            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> Classes scheduled
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full border border-primary" /> Today
              </span>
            </div>
          </Card>

          {/* Right Daily Agenda Card */}
          <Card className="lg:col-span-7 p-6 shadow-card border-border/60">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-border/60 flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-lg text-foreground">
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </h3>
                  {isTodaySelected && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] font-bold">
                      Today
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scheduled classes for {selectedDayName}
                </p>
              </div>

              <Badge variant="outline" className="font-semibold text-xs border-border">
                {selectedDayClasses.length} {selectedDayClasses.length === 1 ? "Class" : "Classes"}
              </Badge>
            </div>

            {selectedDayClasses.length === 0 ? (
              <div className="py-12 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
                  <CalendarDays className="h-6 w-6 text-muted-foreground" />
                </div>
                <h4 className="font-display font-semibold text-base text-foreground">No classes on this day</h4>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  There are no scheduled lectures or sessions on {selectedDayName}. Enjoy your self-study or revise your notes!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayClasses.map((cls, idx) => (
                  <div
                    key={cls._id || cls.id || idx}
                    className={`p-4 rounded-xl shadow-sm border transition-all hover:shadow-md ${getSubjectColor(cls.subject)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm uppercase tracking-wide">{cls.subject}</span>
                          {cls.batch && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-foreground/10">
                              <Users className="h-2.5 w-2.5" /> {cls.batch}
                            </span>
                          )}
                          {cls.studentId && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-foreground/10">
                              <User className="h-2.5 w-2.5" /> 1:1 Mentorship
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs opacity-90 flex-wrap">
                          <span className="flex items-center gap-1 font-semibold">
                            <Clock className="h-3.5 w-3.5" /> {cls.time}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <GraduationCap className="h-3.5 w-3.5" /> {cls.teacher}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span className="inline-block px-2 py-1 rounded text-[10px] font-bold bg-white/70 shadow-2xs">
                          Period {idx + 1}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
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
