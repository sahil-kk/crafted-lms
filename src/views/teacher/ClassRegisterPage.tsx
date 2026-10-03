"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Plus,
  BookOpen,
  User,
  AlertTriangle,
  History,
  Sparkles,
  ChevronRight,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

const SESSION_STATUS_OPTIONS = [
  { value: "completed", label: "Completed", color: "bg-emerald-500 text-white" },
  { value: "student_absent", label: "Student Absent", color: "bg-amber-500 text-white" },
  { value: "teacher_cancelled", label: "Teacher Cancelled", color: "bg-rose-500 text-white" },
  { value: "rescheduled", label: "Rescheduled", color: "bg-blue-500 text-white" },
];

export default function ClassRegisterPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");

  // Selected session to log/confirm
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [activeSlotItem, setActiveSlotItem] = useState<any>(null);

  // Form states for confirmation
  const [sessionStatus, setSessionStatus] = useState<string>("completed");
  const [topicsCovered, setTopicsCovered] = useState("");
  const [selectedSyllabusIds, setSelectedSyllabusIds] = useState<string[]>([]);
  const [sessionNote, setSessionNote] = useState("");

  // One-off session modal
  const [oneOffModalOpen, setOneOffModalOpen] = useState(false);
  const [oneOffStudentId, setOneOffStudentId] = useState("");
  const [oneOffSubject, setOneOffSubject] = useState("");
  const [oneOffTime, setOneOffTime] = useState("17:00");
  const [oneOffDuration, setOneOffDuration] = useState("1.5");
  const [oneOffTopics, setOneOffTopics] = useState("");
  const [oneOffNote, setOneOffNote] = useState("");

  // Fetch today's expected sessions
  const { data: todayData, isLoading: isTodayLoading } = useQuery({
    queryKey: ["class-register-today", selectedDate, user?.id],
    queryFn: async () => {
      const res = await apiClient<any>(`/api/class-register/today?date=${selectedDate}`);
      return res;
    },
  });

  // Fetch recent confirmed entries (history)
  const { data: historyEntries = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ["class-register-history", user?.id],
    queryFn: async () => {
      const res = await apiClient<any>("/api/class-register");
      return res.entries || [];
    },
    enabled: activeTab === "history",
  });

  // Fetch active students for one-off sessions
  const { data: students = [] } = useQuery({
    queryKey: ["students-list"],
    queryFn: async () => {
      const res = await apiClient<any>("/api/students");
      return res || [];
    },
  });

  // Fetch syllabus items for suggestions
  const { data: syllabusData } = useQuery({
    queryKey: ["syllabus-plan-active", activeSlotItem?.slot?.subject],
    queryFn: async () => {
      if (!activeSlotItem?.slot?.subject) return { items: [] };
      const res = await apiClient<any>(`/api/syllabus-plan?subject=${encodeURIComponent(activeSlotItem.slot.subject)}`);
      return res;
    },
    enabled: Boolean(activeSlotItem?.slot?.subject),
  });

  // Log session mutation
  const logSessionMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient<any>("/api/class-register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success("Mentorship session logged! Payroll and coverage updated immediately.");
      setConfirmModalOpen(false);
      setOneOffModalOpen(false);
      resetConfirmForm();
      queryClient.invalidateQueries({ queryKey: ["class-register-today"] });
      queryClient.invalidateQueries({ queryKey: ["class-register-history"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-summary"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to log session");
    },
  });

  const resetConfirmForm = () => {
    setActiveSlotItem(null);
    setTopicsCovered("");
    setSelectedSyllabusIds([]);
    setSessionNote("");
    setSessionStatus("completed");
  };

  const handleOpenConfirm = (item: any) => {
    setActiveSlotItem(item);
    if (item.loggedEntry) {
      setSessionStatus(item.loggedEntry.status);
      setTopicsCovered(item.loggedEntry.topicsCovered);
      setSessionNote(item.loggedEntry.note || "");
      setSelectedSyllabusIds(item.loggedEntry.syllabusItemIds?.map((s: any) => s._id || s) || []);
    } else {
      setSessionStatus("completed");
      setTopicsCovered("");
      setSessionNote("");
      setSelectedSyllabusIds([]);
    }
    setConfirmModalOpen(true);
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSlotItem) return;
    if (!topicsCovered.trim()) {
      toast.error("Please enter the topic covered during the session");
      return;
    }

    logSessionMutation.mutate({
      teacherId: user?.id,
      studentId: activeSlotItem.slot.studentId?._id || activeSlotItem.slot.studentId,
      subject: activeSlotItem.slot.subject,
      sessionDate: selectedDate,
      startTime: activeSlotItem.slot.startTime,
      durationHours: activeSlotItem.slot.durationHours || 1.5,
      status: sessionStatus,
      topicsCovered,
      syllabusItemIds: selectedSyllabusIds,
      note: sessionNote,
      isOneOff: false,
      scheduledSlotId: activeSlotItem.slot._id,
    });
  };

  const handleOneOffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oneOffStudentId || !oneOffSubject || !oneOffTopics.trim()) {
      toast.error("Please complete all required fields");
      return;
    }

    logSessionMutation.mutate({
      teacherId: user?.id,
      studentId: oneOffStudentId,
      subject: oneOffSubject,
      sessionDate: selectedDate,
      startTime: oneOffTime,
      durationHours: Number(oneOffDuration) || 1.5,
      status: "completed",
      topicsCovered: oneOffTopics,
      note: oneOffNote,
      isOneOff: true,
    });
  };

  const todaySlots = todayData?.items || [];
  const loggedCount = todayData?.loggedCount || 0;
  const totalSlots = todayData?.totalSlots || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Class Register</h1>
              <Badge className="bg-orange-500 text-white border-0 font-semibold px-2.5 py-0.5 text-xs">
                Real-Time Payroll Feed
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Confirm your 1:1 sessions in under 60 seconds. Each log updates your monthly payroll count instantly with zero manual approvals.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setOneOffModalOpen(true)}
              variant="outline"
              className="border-orange-300 text-orange-600 hover:bg-orange-50 font-semibold rounded-xl flex items-center gap-2 h-10"
            >
              <Plus className="w-4 h-4" />
              Add One-Off Session
            </Button>
          </div>
        </div>

        {/* View Switcher & Date Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "today" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("today")}
              className={activeTab === "today" ? "bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl" : "text-gray-600"}
            >
              <CalendarCheck className="w-4 h-4 mr-1.5" />
              Daily Sessions
            </Button>
            <Button
              variant={activeTab === "history" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("history")}
              className={activeTab === "history" ? "bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl" : "text-gray-600"}
            >
              <History className="w-4 h-4 mr-1.5" />
              Logged History
            </Button>
          </div>

          {activeTab === "today" && (
            <div className="flex items-center gap-3">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Session Date:</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-44 h-9 text-xs rounded-xl font-medium"
              />
            </div>
          )}
        </div>

        {/* Main Content Area */}
        {activeTab === "today" ? (
          <div>
            {/* Daily summary chip */}
            <div className="flex items-center justify-between bg-orange-50/70 border border-orange-100 rounded-2xl p-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black">
                  {todayData?.dayOfWeek?.substring(0, 3) || "TOD"}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    {todayData?.dayOfWeek}, {selectedDate}
                  </h3>
                  <p className="text-xs text-orange-800">
                    {loggedCount} of {totalSlots} sessions confirmed
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-gray-500 uppercase">Standard Mentorship: </span>
                <span className="text-xs font-black text-orange-600">1.5h per slot</span>
              </div>
            </div>

            {isTodayLoading ? (
              <div className="py-20 text-center text-gray-400 animate-pulse">Loading scheduled sessions...</div>
            ) : todaySlots.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200 text-center p-12 bg-gray-50/50 rounded-2xl shadow-none">
                <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-700">No sessions scheduled for this day</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  Either configure your weekly recurring schedule in the <strong>Weekly Timetable</strong> or log a makeup class with the <strong>Add One-Off Session</strong> button.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todaySlots.map((item: any) => {
                  const { slot, isConfirmed, loggedEntry } = item;
                  const studentName = slot.studentId?.name || "Student";
                  const studentCode = slot.studentId?.studentId || "";

                  return (
                    <Card
                      key={slot._id}
                      className={`p-5 rounded-2xl border transition-all shadow-sm ${
                        isConfirmed ? "bg-white border-emerald-200 ring-1 ring-emerald-100" : "bg-white border-gray-200 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                            {slot.startTime} (1.5h)
                          </span>
                          <h4 className="text-base font-black text-gray-900 pt-1 flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-orange-500 shrink-0" />
                            {slot.subject}
                          </h4>
                        </div>

                        {isConfirmed ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold px-2 py-0.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Logged
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold px-2 py-0.5">
                            Pending
                          </Badge>
                        )}
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

                        {isConfirmed && loggedEntry && (
                          <div className="p-2.5 rounded-xl bg-gray-50 text-xs space-y-1 border border-gray-100">
                            <div className="text-gray-500 font-bold uppercase text-[10px]">Topic Covered:</div>
                            <div className="font-medium text-gray-800 line-clamp-2">{loggedEntry.topicsCovered}</div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <Button
                          onClick={() => handleOpenConfirm(item)}
                          className={`w-full rounded-xl font-semibold text-xs h-9 transition-all ${
                            isConfirmed
                              ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                              : "bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                          }`}
                        >
                          {isConfirmed ? "Edit Logged Details" : "Confirm Session & Log Topic"}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* History View */
          <div className="space-y-4">
            {isHistoryLoading ? (
              <div className="py-20 text-center text-gray-400 animate-pulse">Loading history...</div>
            ) : historyEntries.length === 0 ? (
              <Card className="p-12 text-center text-gray-400 rounded-2xl">No logged sessions recorded yet.</Card>
            ) : (
              <div className="divide-y divide-gray-100 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {historyEntries.map((entry: any) => (
                  <div key={entry._id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/60 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">{entry.sessionDate}</span>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-500">{entry.startTime}</span>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                          {entry.status}
                        </Badge>
                        {entry.isOneOff && (
                          <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">
                            One-Off
                          </Badge>
                        )}
                        {entry.payrollLocked && (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                            Payroll Locked
                          </Badge>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-gray-900">
                        {entry.studentId?.name} <span className="font-normal text-gray-400">({entry.subject})</span>
                      </h4>

                      <p className="text-xs text-gray-600">
                        <strong className="text-gray-800">Topic:</strong> {entry.topicsCovered}
                      </p>
                      {entry.note && (
                        <p className="text-xs text-gray-400 italic">Note: {entry.note}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-gray-500 block">Duration</span>
                      <span className="text-sm font-black text-orange-600">{entry.durationHours || 1.5} hrs</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal */}
        <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-900">
                Confirm Mentorship Session
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                {activeSlotItem?.slot?.subject} with {activeSlotItem?.slot?.studentId?.name} ({selectedDate})
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleConfirmSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Session Status *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SESSION_STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSessionStatus(opt.value)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                        sessionStatus === opt.value
                          ? `${opt.color} border-transparent shadow-sm scale-[1.01]`
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700">Topic(s) Covered *</Label>
                  <span className="text-[11px] text-gray-400">Updates live coverage board</span>
                </div>
                <Textarea
                  placeholder="e.g. Completed Rotational Motion: Angular Momentum conservation & solved JEE Advanced 2024 problem set"
                  value={topicsCovered}
                  onChange={(e) => setTopicsCovered(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              {/* Syllabus Plan quick-tag suggestions if available */}
              {syllabusData?.items && syllabusData.items.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                    Tag against Planned Syllabus Topics
                  </Label>
                  <div className="max-h-36 overflow-y-auto space-y-1 border rounded-xl p-2 bg-gray-50/50">
                    {syllabusData.items.map((planItem: any) => {
                      const isSelected = selectedSyllabusIds.includes(planItem._id);
                      return (
                        <div
                          key={planItem._id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedSyllabusIds(selectedSyllabusIds.filter((id) => id !== planItem._id));
                            } else {
                              setSelectedSyllabusIds([...selectedSyllabusIds, planItem._id]);
                              if (!topicsCovered) setTopicsCovered(planItem.topicName);
                            }
                          }}
                          className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected ? "bg-orange-100 text-orange-900 font-semibold" : "bg-white text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <span>{planItem.topicName}</span>
                          {planItem.isCovered && (
                            <span className="text-[10px] text-emerald-600 font-bold">Already covered</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Session Note / Homework Given (Optional)</Label>
                <Input
                  placeholder="e.g. Assigned Exercise 4.2 questions 1 to 15 for Wednesday"
                  value={sessionNote}
                  onChange={(e) => setSessionNote(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setConfirmModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={logSessionMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                >
                  {logSessionMutation.isPending ? "Confirming..." : "Confirm & Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Add One-Off Session */}
        <Dialog open={oneOffModalOpen} onOpenChange={setOneOffModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-900">Add One-Off Session</DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Log a makeup session or unscheduled class that wasn't on the weekly timetable.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleOneOffSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Student *</Label>
                <Select value={oneOffStudentId} onValueChange={setOneOffStudentId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose student..." />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((st: any) => (
                      <SelectItem key={st._id} value={st.userId?._id || st.userId || st._id}>
                        {st.name} {st.studentId ? `(${st.studentId})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Subject *</Label>
                <Input
                  placeholder="e.g. Physics, Chemistry, Mathematics"
                  value={oneOffSubject}
                  onChange={(e) => setOneOffSubject(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Time *</Label>
                  <Input
                    type="time"
                    value={oneOffTime}
                    onChange={(e) => setOneOffTime(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Duration (Hrs)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={oneOffDuration}
                    onChange={(e) => setOneOffDuration(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Topics Covered *</Label>
                <Textarea
                  placeholder="Describe the topics discussed and problems solved"
                  value={oneOffTopics}
                  onChange={(e) => setOneOffTopics(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Note (Optional)</Label>
                <Input
                  placeholder="Optional remarks"
                  value={oneOffNote}
                  onChange={(e) => setOneOffNote(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setOneOffModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={logSessionMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                >
                  {logSessionMutation.isPending ? "Logging..." : "Save One-Off Session"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
