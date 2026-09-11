"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Video, Play, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AppRole } from "@/hooks/useAuth";
import { useAppData } from "@/hooks/useAppData";

interface Props {
  viewerRole: AppRole;
}

const extractYoutubeId = (input: string) => {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

const ClassesManager = ({ viewerRole }: Props) => {
  const { courses, recordedClasses, createClass, deleteClass, updateClass } = useAppData();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [active, setActive] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", url: "", course_id: "" });
  const [editForm, setEditForm] = useState({ id: "", title: "", description: "", url: "", course_id: "" });
  const rows = [...recordedClasses].sort((a, b) => a.created_at ? b.created_at.localeCompare(a.created_at) : -1);

  const handleOpenEdit = (recording: any) => {
    setEditForm({ 
      id: recording.id, 
      title: recording.title, 
      description: recording.description || "", 
      url: `https://youtube.com/watch?v=${recording.youtube_id}`, 
      course_id: recording.course_id || "" 
    });
    setEditOpen(true);
  };

  const onEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const youtubeId = extractYoutubeId(editForm.url);
    if (!youtubeId) return toast.error("Invalid YouTube URL or video ID");
    
    updateClass(editForm.id, {
      title: editForm.title,
      description: editForm.description,
      youtube_id: youtubeId,
      course_id: editForm.course_id || null,
    });
    toast.success("Class updated");
    setEditOpen(false);
  };

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const youtubeId = extractYoutubeId(form.url);
    if (!youtubeId) return toast.error("Invalid YouTube URL or video ID");
    createClass({
      title: form.title,
      description: form.description,
      youtube_id: youtubeId,
      course_id: form.course_id || null,
    });
    toast.success("Class added");
    setOpen(false);
    setForm({ title: "", description: "", url: "", course_id: "" });
  };

  const onDelete = (id: string) => {
    if (!confirm("Delete this class?")) return;
    deleteClass(id);
    toast.success("Deleted");
  };

  return (
    <DashboardLayout role={viewerRole}>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold">Classes</h2>
          <p className="text-muted-foreground mt-1">Upload and manage YouTube lessons</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero"><Plus className="h-4 w-4 mr-2" />New class</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={onCreate}>
              <DialogHeader><DialogTitle>Upload class</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Title</Label>
                  <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label>YouTube URL or video ID</Label>
                  <Input required placeholder="https://youtube.com/watch?v=..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <Label>Course (optional)</Label>
                  <Select value={form.course_id || "none"} onValueChange={(value) => setForm({ ...form, course_id: value === "none" ? "" : value })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" variant="hero">Add</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <form onSubmit={onEdit}>
            <DialogHeader><DialogTitle>Edit class</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Title</Label>
                <Input required value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
              </div>
              <div>
                <Label>YouTube URL or video ID</Label>
                <Input required placeholder="https://youtube.com/watch?v=..." value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div>
                <Label>Course (optional)</Label>
                <Select value={editForm.course_id || "none"} onValueChange={(value) => setEditForm({ ...editForm, course_id: value === "none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
            <Video className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">No classes yet.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((row) => (
            <Card key={row.id} className="overflow-hidden shadow-card border-border/60 hover:shadow-elevated transition-smooth group">
              <button onClick={() => setActive(row)} className="relative w-full aspect-video bg-muted block">
                <img src={`https://i.ytimg.com/vi/${row.youtube_id}/hqdefault.jpg`} alt={row.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                    <Play className="h-5 w-5 text-primary-foreground fill-current" />
                  </div>
                </div>
              </button>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-semibold line-clamp-2">{row.title}</h3>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(row.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {row.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{row.description}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{active?.title}</DialogTitle></DialogHeader>
          {active && (
            <div className="aspect-video">
              <iframe
                className="w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${active.youtube_id}?autoplay=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ClassesManager;
