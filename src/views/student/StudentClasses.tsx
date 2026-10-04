"use client";

import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, BookOpen, FileText, ClipboardList, 
  ChevronRight, Presentation, Video, GraduationCap
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppData } from "@/hooks/useAppData";

const StudentCourses = () => {
  const { user } = useAuth();
  const { users, courses } = useAppData();

  // Retrieve current student profile details
  const currentStudent = useMemo(() => {
    return users.find(
      (u) =>
        u.id === user?.id ||
        (user?.studentId && u.studentId === user.studentId) ||
        (user?.email && u.email?.toLowerCase() === user.email.toLowerCase())
    );
  }, [users, user]);

  const studentDbId = currentStudent?.id || user?.id;
  const classGrade = currentStudent?.course || "10th";
  const assignedSubjects = currentStudent?.assignedCourses || ["Physics", "Chemistry", "Biology", "Mathematics"];

  // Navigation states
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"live" | "notes" | "assignments">("live");

  const classLink = currentStudent?.classLink || user?.classLink || "";

  // Helper to look up assigned 1:1 mentor for a subject
  const getSubjectMentor = (subjectName: string) => {
    if (!currentStudent?.mentorAssignments) return null;
    const assignment = currentStudent.mentorAssignments.find(
      (ma: any) => ma.subject?.toLowerCase().trim() === subjectName.toLowerCase().trim()
    );
    if (!assignment) return null;
    return users.find((u) => u.id === assignment.teacherId || (u as any)._id === assignment.teacherId) || null;
  };

  const currentMentor = activeSubject ? getSubjectMentor(activeSubject) : null;

  // Retrieve course document (prioritizing 1:1 personalized course and merging general chapters)
  const activeCourse = useMemo(() => {
    if (!activeSubject) return undefined;
    const personal = courses.find(
      (c) =>
        c.classGrade === classGrade &&
        c.subject?.toLowerCase().trim() === activeSubject.toLowerCase().trim() &&
        (c.studentId === studentDbId ||
          (c as any).studentId?._id === studentDbId ||
          (user?.studentId && c.studentId === user?.studentId))
    );
    const general = courses.find(
      (c) =>
        c.classGrade === classGrade &&
        c.subject?.toLowerCase().trim() === activeSubject.toLowerCase().trim() &&
        !c.studentId
    );

    if (personal && (!general || !general.chapters || general.chapters.length === 0)) {
      return personal;
    }
    if (!personal && general) {
      return general;
    }
    if (personal && general) {
      const mergedChapters = [...(general.chapters || [])];
      for (const pCh of personal.chapters || []) {
        const existingIdx = mergedChapters.findIndex(
          (gc: any) =>
            (gc._id && pCh._id && gc._id === pCh._id) ||
            gc.title?.toLowerCase().trim() === pCh.title?.toLowerCase().trim()
        );
        if (existingIdx >= 0) {
          const gc = mergedChapters[existingIdx];
          mergedChapters[existingIdx] = {
            ...gc,
            notes: [...(gc.notes || []), ...(pCh.notes || [])],
            assignments: [...(gc.assignments || []), ...(pCh.assignments || [])],
          };
        } else {
          mergedChapters.push(pCh);
        }
      }
      return {
        ...personal,
        chapters: mergedChapters,
      };
    }
    return personal || general;
  }, [courses, activeSubject, classGrade, studentDbId, user?.studentId]);

  const activeChapter = activeCourse?.chapters?.find(
    (ch) => (ch._id || ch.id) === activeChapterId
  );

  // Helper to open PDF
  const openFile = (fileUrl: string) => {
    const fullUrl = fileUrl.startsWith("http")
      ? fileUrl
      : `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api").replace("/api", "")}/uploads/${fileUrl}`;
    window.open(fullUrl, "_blank");
  };

  return (
    <DashboardLayout role="student">
      {/* ─── LEVEL 1: List Assigned Subjects ─── */}
      {!activeSubject && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold">My Courses</h2>
            <p className="text-muted-foreground mt-1">Access your assigned study materials, notes, and assignments</p>
          </div>

          <Card className="p-6 sm:p-8 shadow-card border-border/60 bg-gradient-to-br from-white via-orange-500/[0.02] to-orange-500/[0.05]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-[#f97316] text-xs font-semibold">
                  <span className="h-2 w-2 rounded-full bg-[#f97316] animate-pulse" />
                  Live Interactive Session
                </div>
                <h3 className="font-display text-xl font-bold text-foreground">
                  {classGrade} Online Live Class
                </h3>
                <p className="text-sm text-muted-foreground max-w-lg">
                  Access your live interactive lecture room. Click the button to join your session.
                </p>
              </div>

              {classLink ? (
                <Button
                  size="lg"
                  onClick={() => window.open(classLink.startsWith("http") ? classLink : `https://${classLink}`, "_blank", "noopener,noreferrer")}
                  className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold shadow-md shadow-orange-500/20 gap-2 shrink-0 w-full sm:w-auto"
                >
                  <Video className="h-5 w-5" /> Join Live Class Now
                </Button>
              ) : (
                <div className="p-4 bg-muted/40 border border-dashed border-border rounded-xl text-center sm:text-left w-full sm:w-auto shrink-0">
                  <p className="text-xs text-muted-foreground font-medium">
                    No live class link available right now.
                  </p>
                </div>
              )}
            </div>
          </Card>
          
          <div className="grid sm:grid-cols-2 gap-5">
            {assignedSubjects.map((sub) => {
              const personalCourse = courses.find(
                (c) =>
                  c.classGrade === classGrade &&
                  c.subject?.toLowerCase().trim() === sub.toLowerCase().trim() &&
                  (c.studentId === studentDbId || (c as any).studentId?._id === studentDbId)
              );
              const generalCourse = courses.find(
                (c) => c.classGrade === classGrade && c.subject?.toLowerCase().trim() === sub.toLowerCase().trim() && !c.studentId
              );
              const chaptersCount = (personalCourse?.chapters?.length || 0) + (generalCourse?.chapters?.length || 0);
              const mentor = getSubjectMentor(sub);

              return (
                <Card 
                  key={sub} 
                  className="p-6 cursor-pointer border border-border/60 hover:border-[#f97316]/50 shadow-card hover:shadow-elevated transition-smooth flex flex-col justify-between"
                  onClick={() => setActiveSubject(sub)}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center">
                        <Presentation className="h-6 w-6 text-[#f97316]" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg text-foreground">{sub}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{chaptersCount} chapters available</p>
                      </div>
                    </div>

                    {mentor && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3 bg-orange-500/5 px-2.5 py-1.5 rounded-lg border border-orange-500/10">
                        <GraduationCap className="h-3.5 w-3.5 text-[#f97316] shrink-0" />
                        <span className="truncate">
                          Mentor: <strong className="text-foreground">{mentor.full_name || mentor.email}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-[#f97316] font-semibold mt-4 ml-auto">
                    View Course <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── LEVEL 2: List Chapters in Subject ─── */}
      {activeSubject && !activeChapterId && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setActiveSubject(null)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back to Courses
            </Button>
            <span className="text-sm font-semibold text-muted-foreground font-mono">
              My Courses / {activeSubject}
            </span>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold">{activeSubject}</h2>
            <p className="text-muted-foreground mt-1">Select a chapter to access files</p>
          </div>

          {currentMentor && (
            <div className="flex items-center justify-between p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5 text-[#f97316]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#f97316]">1:1 Subject Mentor</span>
                    <Badge variant="outline" className="text-[10px] bg-background border-orange-500/30 text-foreground">
                      {activeSubject}
                    </Badge>
                  </div>
                  <h4 className="font-display font-bold text-base text-foreground mt-0.5">
                    {currentMentor.full_name || currentMentor.email}
                  </h4>
                </div>
              </div>
              {currentMentor.phone && (
                <div className="text-right hidden sm:block">
                  <span className="text-[11px] text-muted-foreground block">Mentor Phone</span>
                  <span className="text-xs font-semibold font-mono text-foreground">{currentMentor.phone}</span>
                </div>
              )}
            </div>
          )}

          <Card className="p-6 sm:p-8 shadow-card border-border/60 bg-gradient-to-br from-white via-orange-500/[0.02] to-orange-500/[0.05] max-w-3xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-[#f97316] text-xs font-semibold">
                  <span className="h-2 w-2 rounded-full bg-[#f97316] animate-pulse" />
                  Live Interactive Session
                </div>
                <h3 className="font-display text-xl font-bold text-foreground">
                  {activeSubject} Live Class
                </h3>
                <p className="text-sm text-muted-foreground max-w-lg">
                  Access your live interactive lecture. Click the button to join the session.
                </p>
              </div>

              {classLink ? (
                <Button
                  size="lg"
                  onClick={() => window.open(classLink.startsWith("http") ? classLink : `https://${classLink}`, "_blank", "noopener,noreferrer")}
                  className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold shadow-md shadow-orange-500/20 gap-2 shrink-0 w-full sm:w-auto"
                >
                  <Video className="h-5 w-5" /> Join Live Class Now
                </Button>
              ) : (
                <div className="p-4 bg-muted/40 border border-dashed border-border rounded-xl text-center sm:text-left w-full sm:w-auto shrink-0">
                  <p className="text-xs text-muted-foreground font-medium">
                    No live class link available right now.
                  </p>
                </div>
              )}
            </div>
          </Card>

          <div className="max-w-3xl space-y-3">
            {!activeCourse?.chapters || activeCourse.chapters.length === 0 ? (
              <Card className="p-12 text-center shadow-card border-border/60">
                <BookOpen className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No chapters have been uploaded for this course yet.</p>
              </Card>
            ) : (
              activeCourse.chapters.map((ch) => {
                const chapterId = ch._id || ch.id;
                return (
                  <Card 
                    key={chapterId}
                    className="p-4 border border-border/60 hover:border-[#f97316]/40 transition-smooth flex items-center justify-between gap-4 cursor-pointer"
                    onClick={() => setActiveChapterId(chapterId || null)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-orange-550/10 flex items-center justify-center shrink-0">
                        <BookOpen className="h-4.5 w-4.5 text-[#f97316]" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-sm text-foreground">{ch.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ch.notes?.length || 0} notes • {ch.assignments?.length || 0} assignments available
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── LEVEL 3: View Notes and Assignments ─── */}
      {activeSubject && activeChapterId && activeChapter && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setActiveChapterId(null)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back to Chapters
            </Button>
            <span className="text-sm font-semibold text-muted-foreground font-mono truncate">
              {activeSubject} / {activeChapter.title}
            </span>
          </div>

          <div className="max-w-3xl space-y-4">
            <div className="flex gap-2 border-b border-border">
              <button
                className={`pb-2.5 px-4 text-sm font-semibold transition-all border-b-2 leading-none flex items-center gap-2 ${
                  activeTab === "live"
                    ? "border-[#f97316] text-[#f97316]"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("live")}
              >
                <Video className="h-4 w-4" /> Live Classes
              </button>
              <button
                className={`pb-2.5 px-4 text-sm font-semibold transition-all border-b-2 leading-none flex items-center gap-2 ${
                  activeTab === "notes"
                    ? "border-[#f97316] text-[#f97316]"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("notes")}
              >
                <FileText className="h-4 w-4" /> Notes ({activeChapter.notes?.length || 0})
              </button>
              <button
                className={`pb-2.5 px-4 text-sm font-semibold transition-all border-b-2 leading-none flex items-center gap-2 ${
                  activeTab === "assignments"
                    ? "border-[#f97316] text-[#f97316]"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("assignments")}
              >
                <ClipboardList className="h-4 w-4" /> Assignments ({activeChapter.assignments?.length || 0})
              </button>
            </div>

            {activeTab === "live" ? (
              <Card className="p-6 sm:p-8 shadow-card border-border/60 bg-gradient-to-br from-white via-orange-500/[0.02] to-orange-500/[0.05]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-[#f97316] text-xs font-semibold">
                      <span className="h-2 w-2 rounded-full bg-[#f97316] animate-pulse" />
                      Live Interactive Session
                    </div>
                    <h3 className="font-display text-xl font-bold text-foreground">
                      {activeSubject} - {activeChapter.title}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-lg">
                      Access your live interactive lecture. Click the button to join the session.
                    </p>
                  </div>

                  {classLink ? (
                    <Button
                      size="lg"
                      onClick={() => window.open(classLink.startsWith("http") ? classLink : `https://${classLink}`, "_blank", "noopener,noreferrer")}
                      className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold shadow-md shadow-orange-500/20 gap-2 shrink-0 w-full sm:w-auto"
                    >
                      <Video className="h-5 w-5" /> Join Live Class Now
                    </Button>
                  ) : (
                    <div className="p-4 bg-muted/40 border border-dashed border-border rounded-xl text-center sm:text-left w-full sm:w-auto shrink-0">
                      <p className="text-xs text-muted-foreground font-medium">
                        No live class link available right now.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ) : activeTab === "notes" ? (
              <div className="space-y-3">
                {!activeChapter.notes || activeChapter.notes.length === 0 ? (
                  <Card className="p-12 text-center shadow-card border-border/60">
                    <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No notes have been uploaded for this chapter yet.</p>
                  </Card>
                ) : (
                  activeChapter.notes.map((note: any) => (
                    <Card 
                      key={note._id || note.id}
                      className="p-4 border border-border/60 hover:border-muted-foreground/20 transition-smooth flex items-center justify-between gap-4 cursor-pointer"
                      onClick={() => openFile(note.fileUrl)}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-red-500 shrink-0" />
                        <span className="font-semibold text-sm text-foreground">{note.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">Open PDF</span>
                    </Card>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {!activeChapter.assignments || activeChapter.assignments.length === 0 ? (
                  <Card className="p-12 text-center shadow-card border-border/60">
                    <ClipboardList className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No assignments have been uploaded for this chapter yet.</p>
                  </Card>
                ) : (
                  activeChapter.assignments.map((ass: any) => (
                    <Card 
                      key={ass._id || ass.id}
                      className="p-4 border border-border/60 hover:border-muted-foreground/20 transition-smooth flex items-center justify-between gap-4 cursor-pointer"
                      onClick={() => openFile(ass.fileUrl)}
                    >
                      <div className="flex items-center gap-3">
                        <ClipboardList className="h-5 w-5 text-indigo-500 shrink-0" />
                        <span className="font-semibold text-sm text-foreground">{ass.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">Open PDF</span>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentCourses;
