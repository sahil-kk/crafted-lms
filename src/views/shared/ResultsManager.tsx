"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Trophy, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAppData, ResultObj } from "@/hooks/useAppData";

interface Props {
  viewerRole: "admin" | "teacher" | "student";
}

const ResultsManager = ({ viewerRole }: Props) => {
  const { users, results, createResult, deleteResult, updateResult } = useAppData();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const students = users.filter((u) => u.role === "student");
  
  const [form, setForm] = useState({
    studentId: "",
    subject: "",
    examType: "final",
    score: "",
    maxScore: "",
    grade: "",
    trend: "up"
  });

  const [editForm, setEditForm] = useState({
    id: "",
    studentId: "",
    subject: "",
    examType: "final",
    score: "",
    maxScore: "",
    grade: "",
    trend: "up"
  });

  const handleOpenEdit = (result: any) => {
    setEditForm({
      id: result._id || result.id,
      studentId: result.studentId,
      subject: result.subject,
      examType: result.examType || "final",
      score: result.score?.toString() || "",
      maxScore: result.maxScore?.toString() || "",
      grade: result.grade || "",
      trend: result.trend || "up"
    });
    setEditOpen(true);
  };

  const onEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateResult(editForm.id, {
      studentId: editForm.studentId,
      subject: editForm.subject,
      examType: editForm.examType,
      score: Number(editForm.score),
      maxScore: Number(editForm.maxScore),
      grade: editForm.grade,
      trend: editForm.trend
    });
    toast.success("Result updated!");
    setEditOpen(false);
  };

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createResult({
      studentId: form.studentId,
      subject: form.subject,
      examType: form.examType,
      score: Number(form.score),
      maxScore: Number(form.maxScore),
      grade: form.grade,
      trend: form.trend
    });
    toast.success("Result published!");
    setOpen(false);
    setForm({ studentId: "", subject: "", examType: "final", score: "", maxScore: "", grade: "", trend: "up" });
  };

  return (
    <DashboardLayout role={viewerRole}>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold">Results</h2>
          <p className="text-muted-foreground mt-1">Publish targeted exam grades</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero"><Plus className="h-4 w-4 mr-2" />Add Result</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={onCreate}>
              <DialogHeader><DialogTitle>Publish Result</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Target Student</Label>
                  <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select student..." /></SelectTrigger>
                    <SelectContent>
                      {students.map((stu) => <SelectItem key={stu.id} value={stu.id}>{stu.full_name || stu.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Score</Label>
                    <Input type="number" required value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
                  </div>
                  <div>
                    <Label>Max Score</Label>
                    <Input type="number" required value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Exam Type</Label>
                    <Select value={form.examType} onValueChange={(v) => setForm({ ...form, examType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Grade (Optional)</Label>
                    <Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={!form.studentId} variant="hero">Publish</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <form onSubmit={onEdit}>
            <DialogHeader><DialogTitle>Edit Result</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Target Student</Label>
                <Select value={editForm.studentId} onValueChange={(v) => setEditForm({ ...editForm, studentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select student..." /></SelectTrigger>
                  <SelectContent>
                    {students.map((stu) => <SelectItem key={stu.id} value={stu.id}>{stu.full_name || stu.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Input required value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Score</Label>
                  <Input type="number" required value={editForm.score} onChange={(e) => setEditForm({ ...editForm, score: e.target.value })} />
                </div>
                <div>
                  <Label>Max Score</Label>
                  <Input type="number" required value={editForm.maxScore} onChange={(e) => setEditForm({ ...editForm, maxScore: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Exam Type</Label>
                  <Select value={editForm.examType} onValueChange={(v) => setEditForm({ ...editForm, examType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Grade (Optional)</Label>
                  <Input value={editForm.grade} onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!editForm.studentId} variant="hero">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="p-4 shadow-card border-border/60">
        {!results || results.length === 0 ? (
          <div className="py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary-soft flex items-center justify-center mx-auto mb-3">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">No published results yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r: ResultObj) => {
                const stu = students.find((s) => s.id === r.studentId);
                return (
                  <TableRow key={r._id || r.id}>
                    <TableCell className="font-medium">{stu ? (stu.full_name || stu.email) : r.studentId}</TableCell>
                    <TableCell>{r.subject}</TableCell>
                    <TableCell>{r.score} / {r.maxScore} {r.grade ? `(${r.grade})` : ""}</TableCell>
                    <TableCell className="capitalize">{r.examType}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteResult(r._id! || r.id!)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </DashboardLayout>
  );
};

export default ResultsManager;
