"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowLeft, FileQuestion } from "lucide-react";
import { toast } from "sonner";
import { AppRole } from "@/hooks/useAuth";
import { useAppData } from "@/hooks/useAppData";

interface Props {
  viewerRole: AppRole;
}

const emptyForm = {
  question_text: "",
  question_type: "mcq" as "mcq" | "short" | "long",
  marks: 1,
  options: ["", "", "", ""],
  correct_answer: "",
};

const ExamQuestionsEditor = ({ viewerRole }: Props) => {
  const params = useParams();
  const examId = params?.examId as string;
  const router = useRouter();
  const { exams, questions, createQuestion, deleteQuestion } = useAppData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);

  const exam = exams.find((item) => item.id === examId || (item as any)._id === examId) ?? null;
  const rows = useMemo(
    () => {
      const qFromHook = questions.filter((item) => item.exam_id === examId);
      const qFromExam = ((exam as any)?.questions || []).map((q: any) => ({
        ...q,
        exam_id: examId,
      }));
      const combined = qFromHook.length > 0 ? qFromHook : qFromExam;
      return combined.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
    },
    [examId, questions, exam],
  );

  const resetForm = () => setForm(emptyForm);

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examId) return;
    if (form.question_type === "mcq") {
      const options = form.options.map((option: string) => option.trim()).filter(Boolean);
      if (options.length < 2) return toast.error("Provide at least 2 options");
      if (!options.includes(form.correct_answer)) return toast.error("Select the correct option");
    }

    createQuestion({
      exam_id: examId,
      question_text: form.question_text,
      question_type: form.question_type,
      marks: Number(form.marks),
      options: form.question_type === "mcq" ? form.options.map((option: string) => option.trim()).filter(Boolean) : null,
      correct_answer: form.question_type === "mcq" ? form.correct_answer : null,
    });
    toast.success("Question added");
    setOpen(false);
    resetForm();
  };

  const onDelete = (id: string) => {
    if (!confirm("Delete this question?")) return;
    deleteQuestion(id);
  };

  const basePath = viewerRole === "admin" ? "/admin/exams" : "/teacher/exams";
  const totalMarks = rows.reduce((sum: number, row: any) => sum + Number(row.marks || 0), 0);

  return (
    <DashboardLayout role={viewerRole} title="Edit questions">
      <Button variant="ghost" onClick={() => router.push(basePath)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />Back to exams
      </Button>

      {!exam ? (
        <div className="py-20 text-center text-muted-foreground">Exam not found.</div>
      ) : (
        <>
          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-2xl font-bold">{exam.title}</h2>
              <p className="text-muted-foreground mt-1">{rows.length} question{rows.length !== 1 ? "s" : ""} • {totalMarks} marks total</p>
            </div>
            <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
              <DialogTrigger asChild>
                <Button variant="hero"><Plus className="h-4 w-4 mr-2" />Add question</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <form onSubmit={onCreate}>
                  <DialogHeader><DialogTitle>New question</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Type</Label>
                        <Select value={form.question_type} onValueChange={(value) => setForm({ ...form, question_type: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mcq">Multiple choice</SelectItem>
                            <SelectItem value="short">Short answer</SelectItem>
                            <SelectItem value="long">Long answer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Marks</Label>
                        <Input type="number" min={1} required value={form.marks} onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div>
                      <Label>Question</Label>
                      <Textarea rows={3} required value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} />
                    </div>
                    {form.question_type === "mcq" && (
                      <div className="space-y-2">
                        <Label>Options (mark correct)</Label>
                        {form.options.map((option: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correct"
                              checked={form.correct_answer === option && option !== ""}
                              onChange={() => setForm({ ...form, correct_answer: option })}
                              className="h-4 w-4 accent-primary"
                            />
                            <Input
                              placeholder={`Option ${index + 1}`}
                              value={option}
                              onChange={(e) => {
                                const nextOptions = [...form.options];
                                nextOptions[index] = e.target.value;
                                setForm({
                                  ...form,
                                  options: nextOptions,
                                  correct_answer: form.correct_answer === option ? e.target.value : form.correct_answer,
                                });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="submit" variant="hero">Add</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {rows.length === 0 ? (
            <Card className="p-12 text-center shadow-card border-border/60">
              <div className="h-14 w-14 rounded-2xl bg-primary-soft flex items-center justify-center mx-auto mb-3">
                <FileQuestion className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">No questions yet.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {rows.map((row: any, index: number) => (
                <Card key={row.id} className="p-5 shadow-card border-border/60">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="bg-primary-soft text-primary border-0 capitalize">{row.question_type}</Badge>
                        <Badge variant="outline">{row.marks} marks</Badge>
                      </div>
                      <p className="font-medium whitespace-pre-wrap">{row.question_text}</p>
                      {row.question_type === "mcq" && Array.isArray(row.options) && (
                        <ul className="mt-2 space-y-1 text-sm">
                          {row.options.map((option: string, optionIndex: number) => (
                            <li key={optionIndex} className={option === row.correct_answer ? "text-primary font-medium" : "text-muted-foreground"}>
                              {String.fromCharCode(65 + optionIndex)}. {option} {option === row.correct_answer && "✓"}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(row.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default ExamQuestionsEditor;
