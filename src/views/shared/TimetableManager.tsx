"use client";

import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, CalendarDays, Pencil, Grid, List, Clock, User, Users, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { AppRole } from "@/hooks/useAuth";
import { useAppData, TimetableObj } from "@/hooks/useAppData";

interface Props {
  viewerRole: AppRole;
}

const TimetableManager = ({ viewerRole }: Props) => {
  const { users, timetables, createTimetable, deleteTimetable, updateTimetable } = useAppData();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("all");

  const students = users.filter((u) => u.role === "student");

  // Form State
  const [form, setForm] = useState({
    day: "Monday",
    time: "",
    subject: "",
    teacher: "",
    studentId: "",
    batch: ""
  });

  const [editForm, setEditForm] = useState({
    id: "",
    day: "Monday",
    time: "",
    subject: "",
    teacher: "",
    studentId: "",
    batch: ""
  });

  const handleOpenEdit = (t: any) => {
    setEditForm({
      id: t._id || t.id,
      day: t.day || "Monday",
      time: t.time || "",
      subject: t.subject || "",
      teacher: t.teacher || "",
      studentId: t.studentId || "",
      batch: t.batch || ""
    });
    setEditOpen(true);
  };

  const onEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTimetable(editForm.id, {
      day: editForm.day,
      time: editForm.time,
      subject: editForm.subject,
      teacher: editForm.teacher,
      studentId: editForm.studentId || undefined,
      batch: editForm.batch || undefined
    });
    toast.success("Schedule updated!");
    setEditOpen(false);
  };

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createTimetable({
      day: form.day,
      time: form.time,
      subject: form.subject,
      teacher: form.teacher,
      studentId: form.studentId || undefined,
      batch: form.batch || undefined
    });
    toast.success("Schedule added!");
    setOpen(false);
    setForm({ day: "Monday", time: "", subject: "", teacher: "", studentId: "", batch: "" });
  };

  // Filter timetables list
  const filteredTimetables = useMemo(() => {
    if (!timetables) return [];
    return timetables.filter((t: TimetableObj) => {
      if (selectedBatchFilter === "all") return true;
      if (selectedBatchFilter === "global") return !t.studentId && !t.batch;
      if (selectedBatchFilter === "individual") return !!t.studentId;
      return t.batch === selectedBatchFilter;
    });
  }, [timetables, selectedBatchFilter]);

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
    <DashboardLayout role={viewerRole} title="Timetable Manager">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold">Weekly Timetable</h2>
          <p className="text-muted-foreground mt-1">Manage weekly periods, student batches, and tutor assignments</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggles */}
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

          {viewerRole === "admin" && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="hero"><Plus className="h-4 w-4 mr-2" />Add Period</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <form onSubmit={onCreate}>
                  <DialogHeader>
                    <DialogTitle>New Schedule Block</DialogTitle>
                    <DialogDescription>Create a scheduled class and assign to batches or students.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Target Batch</Label>
                        <Select
                          value={form.batch || "none"}
                          onValueChange={(value) => setForm({ ...form, batch: value === "none" ? "" : value, studentId: "" })}
                        >
                          <SelectTrigger><SelectValue placeholder="Broadcast / None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Batch Restriction</SelectItem>
                            <SelectItem value="Batch 1">Batch 1</SelectItem>
                            <SelectItem value="Batch 2">Batch 2</SelectItem>
                            <SelectItem value="Batch 3">Batch 3</SelectItem>
                            <SelectItem value="Batch 4">Batch 4</SelectItem>
                            <SelectItem value="Batch 5">Batch 5</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Or Student (Optional)</Label>
                        <Select
                          value={form.studentId || "none"}
                          onValueChange={(value) => setForm({ ...form, studentId: value === "none" ? "" : value, batch: "" })}
                        >
                          <SelectTrigger><SelectValue placeholder="All Students" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">All Students</SelectItem>
                            {students.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.full_name || student.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Day</Label>
                        <Select value={form.day} onValueChange={(v) => setForm({ ...form, day: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {daysOfWeek.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Time Range</Label>
                        <Input required placeholder="eg. 09:00 AM - 10:00 AM" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Subject Name</Label>
                        <Input required placeholder="e.g. Mathematics, Physics" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                      </div>
                      <div>
                        <Label>Instructor</Label>
                        <Input required placeholder="e.g. Mrs. Sharma" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" variant="hero">Add to Schedule</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 bg-card p-4 rounded-xl shadow-card border border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2">Filter Timetable:</Label>
          <Button variant={selectedBatchFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedBatchFilter("all")}>All Schedules</Button>
          <Button variant={selectedBatchFilter === "Batch 1" ? "default" : "outline"} size="sm" onClick={() => setSelectedBatchFilter("Batch 1")}>Batch 1</Button>
          <Button variant={selectedBatchFilter === "Batch 2" ? "default" : "outline"} size="sm" onClick={() => setSelectedBatchFilter("Batch 2")}>Batch 2</Button>
          <Button variant={selectedBatchFilter === "Batch 3" ? "default" : "outline"} size="sm" onClick={() => setSelectedBatchFilter("Batch 3")}>Batch 3</Button>
          <Button variant={selectedBatchFilter === "Batch 4" ? "default" : "outline"} size="sm" onClick={() => setSelectedBatchFilter("Batch 4")}>Batch 4</Button>
          <Button variant={selectedBatchFilter === "Batch 5" ? "default" : "outline"} size="sm" onClick={() => setSelectedBatchFilter("Batch 5")}>Batch 5</Button>
          <Button variant={selectedBatchFilter === "global" ? "default" : "outline"} size="sm" onClick={() => setSelectedBatchFilter("global")}>Global / Broadcast</Button>
          <Button variant={selectedBatchFilter === "individual" ? "default" : "outline"} size="sm" onClick={() => setSelectedBatchFilter("individual")}>Individual</Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={onEdit}>
            <DialogHeader>
              <DialogTitle>Edit Schedule Block</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Target Batch</Label>
                  <Select
                    value={editForm.batch || "none"}
                    onValueChange={(value) => setEditForm({ ...editForm, batch: value === "none" ? "" : value, studentId: "" })}
                  >
                    <SelectTrigger><SelectValue placeholder="Broadcast / None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Batch Restriction</SelectItem>
                      <SelectItem value="Batch 1">Batch 1</SelectItem>
                      <SelectItem value="Batch 2">Batch 2</SelectItem>
                      <SelectItem value="Batch 3">Batch 3</SelectItem>
                      <SelectItem value="Batch 4">Batch 4</SelectItem>
                      <SelectItem value="Batch 5">Batch 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Or Student (Optional)</Label>
                  <Select
                    value={editForm.studentId || "none"}
                    onValueChange={(value) => setEditForm({ ...editForm, studentId: value === "none" ? "" : value, batch: "" })}
                  >
                    <SelectTrigger><SelectValue placeholder="All Students" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All Students</SelectItem>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name || student.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Day</Label>
                  <Select value={editForm.day} onValueChange={(v) => setEditForm({ ...editForm, day: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Time Range</Label>
                  <Input required placeholder="eg. 09:00 AM - 10:00 AM" value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Subject Name</Label>
                  <Input required value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} />
                </div>
                <div>
                  <Label>Instructor</Label>
                  <Input required value={editForm.teacher} onChange={(e) => setEditForm({ ...editForm, teacher: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" variant="hero">Update Schedule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Main Content Area */}
      {filteredTimetables.length === 0 ? (
        <Card className="p-16 text-center border-border/60 shadow-card">
          <div className="h-16 w-16 rounded-2xl bg-primary-soft flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">No timetable blocks found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Try choosing a different filter or create a new schedule entry block.
          </p>
        </Card>
      ) : viewMode === "grid" ? (
        /* Visual Schedule Grid View */
        <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-7 gap-4">
          {daysOfWeek.map((day) => {
            const dayPeriods = filteredTimetables.filter((t) => t.day === day);
            return (
              <div key={day} className="flex flex-col gap-3">
                {/* Day Header */}
                <div className="bg-primary/5 text-center py-2.5 rounded-lg border border-primary/10">
                  <span className="font-display font-bold text-sm text-foreground">{day}</span>
                  <span className="block text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">{dayPeriods.length} Periods</span>
                </div>

                {/* Period Cards Droppable */}
                <div className="flex flex-col gap-2.5 flex-1 min-h-[250px] bg-muted/20 p-2 rounded-xl border border-dashed border-border/40">
                  {dayPeriods.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-8">
                      <span className="text-[10px] text-muted-foreground font-medium italic">No classes scheduled</span>
                    </div>
                  ) : (
                    dayPeriods.map((period: TimetableObj) => (
                      <div
                        key={period._id || period.id}
                        className={`group relative p-3 rounded-xl shadow-sm flex flex-col gap-2 transition-all hover:shadow-md ${getSubjectColor(period.subject)}`}
                      >
                        {/* Quick actions hover toolbar */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1.5 top-1.5 bg-background/95 p-0.5 rounded shadow-sm">
                          {viewerRole === "admin" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(period)}
                                className="p-1 hover:text-primary transition-colors text-muted-foreground"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm("Delete this entry?")) {
                                    deleteTimetable(period._id! || period.id!);
                                    toast.success("Entry removed");
                                  }
                                }}
                                className="p-1 hover:text-destructive transition-colors text-muted-foreground"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                        {/* Subject and Details */}
                        <span className="font-bold text-xs leading-tight tracking-tight uppercase line-clamp-2">{period.subject}</span>
                        <div className="flex items-center gap-1.5 text-[10px] opacity-90 font-medium">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{period.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] opacity-90 font-medium">
                          <GraduationCap className="h-3 w-3 shrink-0" />
                          <span>{period.teacher}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Standard Table View */
        <Card className="p-4 shadow-card border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target Batch/Student</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Time Block</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Instructor</TableHead>
                {viewerRole === "admin" && <TableHead className="text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTimetables.map((t: TimetableObj) => {
                const stu = students.find((s) => s.id === t.studentId);
                return (
                  <TableRow key={t._id || t.id}>
                    <TableCell className="font-semibold">
                      {t.batch ? (
                        <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                          {t.batch}
                        </span>
                      ) : t.studentId ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          Personal
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Global / Broadcast</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">{t.day}</TableCell>
                    <TableCell className="text-sm font-medium">{t.time}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-muted text-foreground">
                        {t.subject}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-foreground/80">{t.teacher}</TableCell>
                    {viewerRole === "admin" && (
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(t)} className="hover:bg-primary-soft hover:text-primary">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Delete this?")) {
                                deleteTimetable(t._id! || t.id!);
                                toast.success("Entry deleted");
                              }
                            }}
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </DashboardLayout>
  );
};

export default TimetableManager;
