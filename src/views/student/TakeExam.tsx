"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAppData } from "@/hooks/useAppData";
import { Question } from "@/lib/mockData";

const TakeExam = () => {
  const params = useParams();
  const examId = params?.examId as string;
  const router = useRouter();
  const { user } = useAuth();
  const { exams, questions: allQuestions, attemptAnswers, getOrCreateAttempt, saveAnswer, submitExam } = useAppData();

  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number>(0);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!user || !examId) return;

    const attempt = getOrCreateAttempt(examId, user.id);
    if (attempt.status === "submitted") {
      toast.info("You already submitted this exam.");
      router.push("/dashboard/results");
      return;
    }

    const nextExam = exams.find((item) => item.id === examId || (item as any)._id === examId) ?? null;
    const questionsFromHook = allQuestions.filter((item) => item.exam_id === examId);
    const questionsFromExam = ((nextExam as any)?.questions || []).map((q: any) => ({
      ...q,
      exam_id: examId,
    }));
    const nextQuestions = (questionsFromHook.length > 0 ? questionsFromHook : questionsFromExam)
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

    setAttemptId(attempt.id);
    setExam(nextExam);
    setQuestions(nextQuestions);

    const nextAnswers: Record<string, string> = {};
    attemptAnswers
      .filter((item) => item.attempt_id === attempt.id)
      .forEach((item) => {
        nextAnswers[item.question_id] = item.answer;
      });
    setAnswers(nextAnswers);

    if (nextExam) {
      const startMs = new Date(attempt.started_at).getTime();
      const endMs = startMs + nextExam.duration_minutes * 60_000;
      setRemaining(Math.max(0, Math.floor((endMs - Date.now()) / 1000)));
    }
    setLoading(false);
  }, [allQuestions, attemptAnswers, examId, exams, getOrCreateAttempt, router.push, user]);

  useEffect(() => {
    if (!exam || submittedRef.current) return;
    const timer = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          clearInterval(timer);
          void onSubmit(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [exam]);

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (!attemptId) return;
    saveAnswer(attemptId, questionId, value);
  };

  const onSubmit = async (auto = false) => {
    if (submittedRef.current || !attemptId) return;
    if (!auto && !confirm("Submit exam? You won't be able to change answers.")) return;
    submittedRef.current = true;
    setSubmitting(true);
    submitExam({ attemptId, answers });
    toast.success(auto ? "Time's up, exam submitted" : "Exam submitted");
    router.push("/dashboard/results");
    setSubmitting(false);
  };

  const mmss = useMemo(() => {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [remaining]);

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  if (!exam) return null;

  return (
    <DashboardLayout role="student" title={exam.title}>
      <Button variant="ghost" onClick={() => router.push("/dashboard/exams")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />Back
      </Button>

      <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-background/80 backdrop-blur-md border-b border-border mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-lg">{exam.title}</h2>
          <p className="text-xs text-muted-foreground">{questions.length} questions</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-primary-soft text-primary border-0 gap-1.5 py-1.5 px-3">
            <Clock className="h-3.5 w-3.5" />{mmss}
          </Badge>
          <Button variant="hero" onClick={() => void onSubmit(false)} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <CheckCircle2 className="h-4 w-4 mr-2" />Submit
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <Card key={question.id} className="p-6 shadow-card border-border/60">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{question.marks} marks</Badge>
                  <Badge variant="secondary" className="bg-primary-soft text-primary border-0 text-xs capitalize">{question.question_type}</Badge>
                </div>
                <p className="font-medium whitespace-pre-wrap">{question.question_text}</p>
              </div>
            </div>
            {question.question_type === "mcq" && Array.isArray(question.options) ? (
              <div className="space-y-2 pl-11">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={optionIndex}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-smooth ${
                      answers[question.id] === option ? "border-primary bg-primary-soft" : "border-border hover:bg-secondary"
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === option}
                      onChange={() => setAnswer(question.id, option)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="pl-11">
                <Textarea
                  rows={question.question_type === "long" ? 6 : 3}
                  placeholder="Type your answer..."
                  value={answers[question.id] ?? ""}
                  onChange={(e) => setAnswer(question.id, e.target.value)}
                />
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <Button variant="hero" size="lg" onClick={() => void onSubmit(false)} disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Submit exam
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default TakeExam;
