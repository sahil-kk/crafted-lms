"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, Trash2, User, BookOpen, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export default function WeeklyTimetablePage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form state
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<string>("Monday");
  const [startTime, setStartTime] = useState("16:00");
  const [durationHours, setDurationHours] = useState("1.5");
  const [teacherId, setTeacherId] = useState(user?.id || "");

  // Fetch slots
  const { data, isLoading } = useQuery({
    queryKey: ["weekly-timetable", user?.id],
    queryFn: async () => {
      const res = await apiClient<any>("/api/weekly-timetable");
      return res.slots || [];
    },
  });

  // Fetch active students
  const { data: students = [] } = useQuery({
    queryKey: ["students-list"],
    queryFn: async () => {
      const res = await apiClient<any>("/api/students");
      return res || [];
    },
  });

  // Create slot mutation
  const createSlotMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient<any>("/api/weekly-timetable", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success("1:1 Weekly slot scheduled successfully!");
      setIsAddOpen(false);
      setStudentId("");
      setSubject("");
      queryClient.invalidateQueries({ queryKey: ["weekly-timetable"] });
      queryClient.invalidateQueries({ queryKey: ["class-register-today"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to schedule slot");
    },
  });

  // Delete/Deactivate slot mutation
  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      return await apiClient<any>(`/api/weekly-timetable/${slotId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast.success("Scheduled slot removed");
      queryClient.invalidateQueries({ queryKey: ["weekly-timetable"] });
      queryClient.invalidateQueries({ queryKey: ["class-register-today"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove slot");
    },
  });

  const slots = data || [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !subject || !dayOfWeek || !startTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    createSlotMutation.mutate({
      teacherId: user?.id,
      studentId,
      subject,
      dayOfWeek,
      startTime,
      durationHours: Number(durationHours) || 1.5,
    });
  };

  const filteredSlots = selectedDay === "all" ? slots : slots.filter((s: any) => s.dayOfWeek === selectedDay);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Weekly 1:1 Timetable</h1>
              <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200 text-xs font-semibold px-2.5 py-0.5">
                Fixed 1.5 Hr Mentorship
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Set up your recurring weekly mentoring schedule. Sessions will auto-populate your Class Register every day.
            </p>
          </div>

          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center gap-2 shadow-sm rounded-xl px-4 py-2 h-10 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            Schedule Weekly Slot
          </Button>
        </div>

        {/* Day Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <Button
            variant={selectedDay === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDay("all")}
            className={selectedDay === "all" ? "bg-gray-900 text-white" : "text-gray-600 bg-white"}
          >
            All Days ({slots.length})
          </Button>
          {DAYS_OF_WEEK.map((day) => {
            const count = slots.filter((s: any) => s.dayOfWeek === day).length;
            return (
              <Button
                key={day}
                variant={selectedDay === day ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDay(day)}
                className={`whitespace-nowrap ${
                  selectedDay === day
                    ? "bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                    : "text-gray-600 hover:text-gray-900 bg-white"
                }`}
              >
                {day}
                {count > 0 && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.2 rounded-full ${selectedDay === day ? "bg-orange-700/60" : "bg-gray-100 text-gray-700"}`}>
                    {count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Weekly Grid */}
        {isLoading ? (
          <div className="py-20 text-center text-gray-400 animate-pulse">Loading weekly timetable slots...</div>
        ) : filteredSlots.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200 shadow-none text-center p-12 bg-gray-50/50 rounded-2xl">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-700">No scheduled slots for this day</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Click the button above to add recurring 1:1 sessions for your students across any day of the week.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSlots.map((slot: any) => {
              const studentName = slot.studentId?.name || "Student";
              const studentCode = slot.studentId?.studentId || "";

              return (
                <Card
                  key={slot._id}
                  className="p-5 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all bg-white relative group"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-100">
                        {slot.dayOfWeek}
                      </span>
                      <h4 className="text-base font-black text-gray-900 pt-1 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-orange-500 shrink-0" />
                        {slot.subject}
                      </h4>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Remove this recurring ${slot.dayOfWeek} slot for ${studentName}?`)) {
                          deleteSlotMutation.mutate(slot._id);
                        }
                      }}
                      className="text-gray-300 hover:text-red-500 hover:bg-red-50 h-8 w-8 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900">{studentName}</span>
                      {studentCode && (
                        <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border">
                          {studentCode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{slot.startTime}</span>
                      <span>•</span>
                      <span className="text-orange-600 font-semibold">{slot.durationHours || 1.5} hrs (1:1 session)</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal: Schedule Weekly Slot */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-900">Schedule 1:1 Weekly Slot</DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                This session will repeat weekly and automatically appear on your Class Register for quick confirmation.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Select Student *</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a student..." />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((st: any) => (
                      <SelectItem key={st._id} value={st.userId?._id || st.userId || st._id}>
                        {st.name} {st.studentId ? `(${st.studentId})` : ""} - {st.grade || "Grade"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Subject *</Label>
                <Input
                  placeholder="e.g. Physics (JEE Adv), Mathematics, NEET Biology"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Day of Week *</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Start Time *</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-between text-xs text-orange-900 font-medium">
                <span>Standard 1:1 Duration:</span>
                <span className="font-bold">1.5 Hours</span>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSlotMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                >
                  {createSlotMutation.isPending ? "Scheduling..." : "Save Slot"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
