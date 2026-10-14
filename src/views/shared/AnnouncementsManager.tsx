"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Megaphone, Pencil, User, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppRole } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { useAppData } from "@/hooks/useAppData";

interface Props {
  viewerRole: AppRole;
}

const AnnouncementsManager = ({ viewerRole }: Props) => {
  const { announcements, users, createAnnouncement, deleteAnnouncement, updateAnnouncement } = useAppData();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    is_global: viewerRole === "admin",
    studentId: "all",
    category: "general" as const,
  });
  const [editForm, setEditForm] = useState({
    id: "",
    title: "",
    body: "",
    is_global: false,
    studentId: "all",
    category: "general" as const,
  });

  const students = users.filter((u) => u.role === "student");
  const rows = [...announcements].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  const getStudentName = (studentId?: string | null) => {
    if (!studentId || studentId === "all") return null;
    const match = students.find((s) => s.id === studentId || (s as any)._id === studentId || s.studentId === studentId);
    return match ? match.full_name : "Assigned Student";
  };

  const handleOpenEdit = (announcement: any) => {
    setEditForm({ 
      id: announcement.id, 
      title: announcement.title, 
      body: announcement.body, 
      is_global: announcement.is_global,
      studentId: announcement.studentId || "all",
      category: (announcement.category as any) || "general",
    });
    setEditOpen(true);
  };

  const onEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const isGlobal = editForm.studentId === "all" ? editForm.is_global : false;
    updateAnnouncement(editForm.id, {
      title: editForm.title,
      body: editForm.body,
      is_global: isGlobal,
      studentId: editForm.studentId === "all" ? null : editForm.studentId,
      category: editForm.category,
    });
    toast.success("Announcement updated");
    setEditOpen(false);
  };

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const isGlobal = form.studentId === "all" ? form.is_global : false;
    createAnnouncement({
      title: form.title,
      body: form.body,
      is_global: isGlobal,
      studentId: form.studentId === "all" ? null : form.studentId,
      category: form.category,
    });
    toast.success("Announcement posted");
    setOpen(false);
    setForm({
      title: "",
      body: "",
      is_global: viewerRole === "admin",
      studentId: "all",
      category: "general",
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    deleteAnnouncement(id);
    toast.success("Deleted");
  };

  return (
    <DashboardLayout role={viewerRole}>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold">Announcements</h2>
          <p className="text-muted-foreground mt-1">
            Post updates for {viewerRole === "admin" ? "the whole platform or individual students" : "your assigned students"}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero"><Plus className="h-4 w-4 mr-2" />New post</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={onCreate}>
              <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Title</Label>
                  <Input required placeholder="Important update or class notice" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label>Message Body</Label>
                  <Textarea rows={5} required placeholder="Write your announcement details here..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                </div>

                {/* Target Audience: All students or a specific student */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Audience</Label>
                    <Select
                      value={form.studentId}
                      onValueChange={(val) => setForm({ ...form, studentId: val, is_global: val === "all" })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Target Audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {viewerRole === "admin" ? "🌐 All Students (Public)" : "👥 All My Assigned Students"}
                        </SelectItem>
                        {students.map((s) => (
                          <SelectItem key={s.id || (s as any)._id} value={s.id || (s as any)._id}>
                            👤 {s.full_name} ({s.course || "Student"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={form.category}
                      onValueChange={(val: any) => setForm({ ...form, category: val })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">📢 General Notice</SelectItem>
                        <SelectItem value="academic">📚 Academic & Course</SelectItem>
                        <SelectItem value="class">🎓 Live Class / Session</SelectItem>
                        {viewerRole === "admin" && (
                          <SelectItem value="fee">💳 Fee & Billing Notice</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {viewerRole === "admin" && form.studentId === "all" && (
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <Label>Global Banner</Label>
                      <p className="text-xs text-muted-foreground">Mark as a platform-wide notice across all dashboards</p>
                    </div>
                    <Switch checked={form.is_global} onCheckedChange={(value) => setForm({ ...form, is_global: value })} />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" variant="hero">Post Announcement</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <form onSubmit={onEdit}>
            <DialogHeader><DialogTitle>Edit announcement</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Title</Label>
                <Input required value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
              </div>
              <div>
                <Label>Body</Label>
                <Textarea rows={5} required value={editForm.body} onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Audience</Label>
                  <Select
                    value={editForm.studentId}
                    onValueChange={(val) => setEditForm({ ...editForm, studentId: val, is_global: val === "all" })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Target Audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {viewerRole === "admin" ? "🌐 All Students (Public)" : "👥 All My Assigned Students"}
                      </SelectItem>
                      {students.map((s) => (
                        <SelectItem key={s.id || (s as any)._id} value={s.id || (s as any)._id}>
                          👤 {s.full_name} ({s.course || "Student"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={editForm.category}
                    onValueChange={(val: any) => setEditForm({ ...editForm, category: val })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">📢 General Notice</SelectItem>
                      <SelectItem value="academic">📚 Academic & Course</SelectItem>
                      <SelectItem value="class">🎓 Live Class / Session</SelectItem>
                      {viewerRole === "admin" && (
                        <SelectItem value="fee">💳 Fee & Billing Notice</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {viewerRole === "admin" && editForm.studentId === "all" && (
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Label>Global Banner</Label>
                    <p className="text-xs text-muted-foreground">Mark as a platform-wide notice</p>
                  </div>
                  <Switch checked={editForm.is_global} onCheckedChange={(value) => setEditForm({ ...editForm, is_global: value })} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" variant="hero">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {rows.length === 0 ? (
        <Card className="p-12 text-center shadow-card border-border/60">
          <div className="h-14 w-14 rounded-2xl bg-primary-soft flex items-center justify-center mx-auto mb-3">
            <Megaphone className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const studentTargetName = getStudentName(row.studentId);
            const isFeeNotice = row.category === "fee" || row.title?.toLowerCase().includes("fee due");

            return (
              <Card key={row.id} className="p-6 shadow-card border-border/60">
                <div className="flex items-start gap-4">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isFeeNotice ? "bg-amber-100 text-amber-700" : "bg-primary-soft text-primary"
                  }`}>
                    {isFeeNotice ? <Sparkles className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-semibold text-foreground">{row.title}</h3>
                      {row.is_global ? (
                        <Badge variant="secondary" className="bg-primary-soft text-primary border-0 text-xs">
                          Global
                        </Badge>
                      ) : studentTargetName ? (
                        <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700 text-xs gap-1">
                          <User className="h-3 w-3" /> Exclusive: {studentTargetName}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
                          Targeted
                        </Badge>
                      )}
                      {row.category && row.category !== "general" && (
                        <Badge variant="outline" className="capitalize text-xs">
                          {row.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">{row.body}</p>
                    <p className="text-xs text-muted-foreground/70 mt-3">
                      {formatDistanceToNow(new Date(row.created_at || new Date()), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(row.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AnnouncementsManager;
