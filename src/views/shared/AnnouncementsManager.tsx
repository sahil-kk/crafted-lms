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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Megaphone, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AppRole } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { useAppData } from "@/hooks/useAppData";

interface Props {
  viewerRole: AppRole;
}

const AnnouncementsManager = ({ viewerRole }: Props) => {
  const { announcements, createAnnouncement, deleteAnnouncement, updateAnnouncement } = useAppData();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", is_global: viewerRole === "admin" });
  const [editForm, setEditForm] = useState({ id: "", title: "", body: "", is_global: false });
  const rows = [...announcements].sort((a, b) => a.created_at ? b.created_at.localeCompare(a.created_at) : -1);

  const handleOpenEdit = (announcement: any) => {
    setEditForm({ 
      id: announcement.id, 
      title: announcement.title, 
      body: announcement.body, 
      is_global: announcement.is_global 
    });
    setEditOpen(true);
  };

  const onEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateAnnouncement(editForm.id, {
      title: editForm.title,
      body: editForm.body,
      is_global: editForm.is_global
    });
    toast.success("Announcement updated");
    setEditOpen(false);
  };

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createAnnouncement(form);
    toast.success("Posted");
    setOpen(false);
    setForm({ title: "", body: "", is_global: viewerRole === "admin" });
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
          <p className="text-muted-foreground mt-1">Post updates for {viewerRole === "admin" ? "the whole platform" : "your students"}</p>
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
                  <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label>Body</Label>
                  <Textarea rows={5} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                </div>
                {viewerRole === "admin" && (
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <Label>Global</Label>
                      <p className="text-xs text-muted-foreground">Mark as a platform-wide notice</p>
                    </div>
                    <Switch checked={form.is_global} onCheckedChange={(value) => setForm({ ...form, is_global: value })} />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" variant="hero">Post</Button>
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
              {viewerRole === "admin" && (
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Label>Global</Label>
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
          {rows.map((row) => (
            <Card key={row.id} className="p-6 shadow-card border-border/60">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-semibold">{row.title}</h3>
                    {row.is_global && <Badge variant="secondary" className="bg-primary-soft text-primary border-0 text-xs">Global</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">{row.body}</p>
                  <p className="text-xs text-muted-foreground/70 mt-3">
                    {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
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
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AnnouncementsManager;
