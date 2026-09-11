"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { MessageSquare, Reply, Save, Settings2, UserCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/apiClient";
import { AppRole } from "@/hooks/useAuth";
import { toast } from "sonner";

type PortalRole = Extract<AppRole, "teacher" | "admin">;

interface MessageThread {
  _id?: string;
  id?: string;
  subject: string;
  message: string;
  status?: string;
  createdAt?: string;
  parent?: { name?: string; email?: string };
  student?: { name?: string; studentId?: string; course?: string; batch?: string; profilePhoto?: string };
  teacher?: { name?: string; email?: string; subject?: string };
  replies?: Array<{
    _id?: string;
    senderRole: "teacher" | "admin";
    message: string;
    createdAt?: string;
    sender?: { name?: string; email?: string };
  }>;
}

interface ParentRow {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  relationship?: string;
  student?: { _id?: string; name?: string; studentId?: string; course?: string; batch?: string };
}

interface ControlRow {
  _id?: string;
  parent?: { _id?: string; name?: string; email?: string };
  student?: { name?: string; studentId?: string; course?: string; batch?: string };
  dailyStudyGoalMinutes?: number;
  maxPracticeTestsPerDay?: number;
  allowRecordedClasses?: boolean;
  allowPracticeExams?: boolean;
  allowWeekendStudy?: boolean;
  focusSubjects?: string[];
  notes?: string;
}

const defaultControls = {
  dailyStudyGoalMinutes: 90,
  maxPracticeTestsPerDay: 2,
  allowRecordedClasses: true,
  allowPracticeExams: true,
  allowWeekendStudy: true,
  focusSubjects: "",
  notes: "",
};

const threadId = (thread: MessageThread) => thread._id || thread.id || "";
const rowParentId = (row: ParentRow | ControlRow) => {
  const control = row as ControlRow;
  const parent = row as ParentRow;
  return control.parent?._id || parent._id || parent.id || "";
};
const safeDate = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export const ParentCommunicationCenter = ({ role }: { role: PortalRole }) => {
  const [messages, setMessages] = useState<MessageThread[]>([]);
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [controls, setControls] = useState<ControlRow[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [controlForms, setControlForms] = useState<Record<string, typeof defaultControls>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const loadedMessages = await apiClient<MessageThread[]>("/parents/messages");
      setMessages(loadedMessages);

      if (role === "admin") {
        const overview = await apiClient<{ parents: ParentRow[]; controls: ControlRow[] }>("/parents/admin/controls");
        setParents(overview.parents || []);
        setControls(overview.controls || []);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not load parent communication";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (role !== "admin") return;

    const nextForms: Record<string, typeof defaultControls> = {};
    parents.forEach((parent) => {
      const parentId = rowParentId(parent);
      const saved = controls.find((control) => rowParentId(control) === parentId);
      nextForms[parentId] = {
        dailyStudyGoalMinutes: saved?.dailyStudyGoalMinutes ?? defaultControls.dailyStudyGoalMinutes,
        maxPracticeTestsPerDay: saved?.maxPracticeTestsPerDay ?? defaultControls.maxPracticeTestsPerDay,
        allowRecordedClasses: saved?.allowRecordedClasses ?? defaultControls.allowRecordedClasses,
        allowPracticeExams: saved?.allowPracticeExams ?? defaultControls.allowPracticeExams,
        allowWeekendStudy: saved?.allowWeekendStudy ?? defaultControls.allowWeekendStudy,
        focusSubjects: (saved?.focusSubjects || []).join(", "),
        notes: saved?.notes || "",
      };
    });
    setControlForms(nextForms);
  }, [controls, parents, role]);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => safeDate(b.createdAt).getTime() - safeDate(a.createdAt).getTime()),
    [messages],
  );

  const sendReply = async (event: FormEvent, id: string) => {
    event.preventDefault();
    const message = replyText[id]?.trim();
    if (!message) return;

    setSavingId(id);
    try {
      const updated = await apiClient<MessageThread>(`/parents/messages/${id}/replies`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setMessages((prev) => prev.map((item) => (threadId(item) === id ? updated : item)));
      setReplyText((prev) => ({ ...prev, [id]: "" }));
      toast.success("Reply sent");
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "Could not send reply";
      toast.error(error);
    } finally {
      setSavingId(null);
    }
  };

  const saveControls = async (parentId: string) => {
    const form = controlForms[parentId];
    if (!form) return;

    setSavingId(parentId);
    try {
      const saved = await apiClient<ControlRow>(`/parents/admin/controls/${parentId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          focusSubjects: form.focusSubjects.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      setControls((prev) => {
        const exists = prev.some((item) => rowParentId(item) === parentId);
        return exists ? prev.map((item) => (rowParentId(item) === parentId ? saved : item)) : [saved, ...prev];
      });
      toast.success("Parent controls updated");
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "Could not update controls";
      toast.error(error);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <DashboardLayout role={role} title={role === "admin" ? "Parent Controls" : "Parent Messages"}>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold">{role === "admin" ? "Parent Communication & Controls" : "Parent Messages"}</h2>
          <p className="text-muted-foreground mt-1">
            {role === "admin" ? "Monitor parent-teacher conversations and manage parent portal activity controls." : "Read parent messages and reply to the family."}
          </p>
        </div>

        {loading && <Card className="p-4 text-sm text-muted-foreground">Loading communication...</Card>}

        <div className="grid gap-4">
          {sortedMessages.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No parent messages yet.
            </Card>
          ) : sortedMessages.map((thread) => {
            const id = threadId(thread);
            const studentName = thread.student?.name || "Student";
            return (
              <Card key={id} className="p-5 shadow-card border-border/60">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-bold text-lg">{thread.subject}</h3>
                      <Badge className="bg-primary-soft text-primary border-0 hover:bg-primary-soft">{thread.status || "sent"}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Parent: {thread.parent?.name || thread.parent?.email || "Parent"} | Student: {studentName}
                      {thread.teacher ? ` | Teacher: ${thread.teacher.name || thread.teacher.email}` : ""}
                    </div>
                    <p className="mt-3 text-sm text-foreground whitespace-pre-wrap">{thread.message}</p>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {format(safeDate(thread.createdAt), "MMM d, yyyy h:mm a")}
                  </div>
                </div>

                {(thread.replies || []).length > 0 && (
                  <div className="mt-4 space-y-2">
                    {thread.replies?.map((reply, index) => (
                      <div key={reply._id || index} className="rounded-xl bg-secondary/50 px-4 py-3">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground">
                          {reply.sender?.name || reply.senderRole} replied
                          {reply.createdAt ? ` | ${format(safeDate(reply.createdAt), "MMM d, h:mm a")}` : ""}
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={(event) => sendReply(event, id)} className="mt-4 flex flex-col gap-3">
                  <Textarea
                    value={replyText[id] || ""}
                    onChange={(event) => setReplyText((prev) => ({ ...prev, [id]: event.target.value }))}
                    placeholder="Write a reply"
                    className="min-h-20"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" variant="hero" className="gap-2" disabled={savingId === id || !replyText[id]?.trim()}>
                      <Reply className="h-4 w-4" /> Reply
                    </Button>
                  </div>
                </form>
              </Card>
            );
          })}
        </div>

        {role === "admin" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pt-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <h3 className="font-display font-bold text-xl">Parent Portal Controls</h3>
            </div>
            {parents.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">No parent accounts found.</Card>
            ) : parents.map((parent) => {
              const parentId = rowParentId(parent);
              const form = controlForms[parentId] || defaultControls;
              const student = parent.student;
              return (
                <Card key={parentId} className="p-5 shadow-card border-border/60">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                        <UserCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold">{parent.name || parent.email}</div>
                        <div className="text-xs text-muted-foreground">
                          Linked student: {student?.name || student?.studentId || "Not linked"}
                        </div>
                      </div>
                    </div>
                    <Button variant="hero" className="gap-2" onClick={() => saveControls(parentId)} disabled={savingId === parentId}>
                      <Save className="h-4 w-4" /> Save Controls
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-5">
                    <div>
                      <Label>Daily study goal minutes</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.dailyStudyGoalMinutes}
                        onChange={(event) => setControlForms((prev) => ({ ...prev, [parentId]: { ...form, dailyStudyGoalMinutes: Number(event.target.value) } }))}
                      />
                    </div>
                    <div>
                      <Label>Max practice tests per day</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.maxPracticeTestsPerDay}
                        onChange={(event) => setControlForms((prev) => ({ ...prev, [parentId]: { ...form, maxPracticeTestsPerDay: Number(event.target.value) } }))}
                      />
                    </div>
                    <div>
                      <Label>Focus subjects</Label>
                      <Input
                        value={form.focusSubjects}
                        onChange={(event) => setControlForms((prev) => ({ ...prev, [parentId]: { ...form, focusSubjects: event.target.value } }))}
                        placeholder="Math, Science"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 mt-4">
                    {[
                      ["allowRecordedClasses", "Recorded classes"],
                      ["allowPracticeExams", "Practice exams"],
                      ["allowWeekendStudy", "Weekend study"],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(form[key as keyof typeof defaultControls])}
                          onChange={(event) => setControlForms((prev) => ({ ...prev, [parentId]: { ...form, [key]: event.target.checked } }))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  <div className="mt-4">
                    <Label>Admin notes</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(event) => setControlForms((prev) => ({ ...prev, [parentId]: { ...form, notes: event.target.value } }))}
                      placeholder="Notes visible in admin controls"
                    />
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

export default ParentCommunicationCenter;
