"use client";

import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, Plus, Trash2, BookOpen, FileText, 
  ChevronRight, Upload, ClipboardList, Presentation
} from "lucide-react";
import { toast } from "sonner";
import { AppRole, useAuth } from "@/hooks/useAuth";
import { useAppData } from "@/hooks/useAppData";

const CLASSES = ["8th", "9th", "10th", "11th", "12th"];
const SUBJECTS = ["Physics", "Chemistry", "Biology", "Mathematics"];

const AdminCourses = ({ viewerRole = "admin" as AppRole }) => {
  const { user } = useAuth();
  const { 
    users,
    courses, 
    addChapter, 
    deleteChapter, 
    uploadMaterial, 
    deleteMaterial 
  } = useAppData();

  const currentTeacher = users.find((u) => u.id === user?.id);
  const teacherSubject = currentTeacher?.subject || "Physics";

  // Navigation states
  const [activeClass, setActiveClass] = useState<string | null>(null);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  
  // Content Tab: "notes" | "assignments"
  const [activeTab, setActiveTab] = useState<"notes" | "assignments">("notes");

  // Input states
  const [chapterTitle, setChapterTitle] = useState("");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Retrieve current course document matching class + subject
  const activeCourse = courses.find(
    (c) => c.classGrade === activeClass && c.subject === activeSubject
  );

  const activeChapter = activeCourse?.chapters?.find(
    (ch) => (ch._id || ch.id) === activeChapterId
  );

  // Handle Chapter creation
  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !chapterTitle.trim()) return;
    try {
      await addChapter(activeCourse.id, chapterTitle.trim());
      toast.success("Chapter added successfully");
      setChapterTitle("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add chapter");
    }
  };

  // Handle Chapter deletion
  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm("Are you sure you want to delete this chapter? All notes and assignments inside will be lost.")) return;
    try {
      await deleteChapter(activeCourse!.id, chapterId);
      toast.success("Chapter deleted successfully");
      if (activeChapterId === chapterId) {
        setActiveChapterId(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete chapter");
    }
  };

  // Handle Material Upload
  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !activeChapterId || !materialTitle.trim() || !materialFile) {
      toast.error("Please fill in the title and select a file");
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", materialFile);
      formData.append("title", materialTitle.trim());
      formData.append("type", activeTab === "notes" ? "note" : "assignment");

      await uploadMaterial(activeCourse.id, activeChapterId, formData);
      toast.success(`${activeTab === "notes" ? "Note" : "Assignment"} uploaded successfully`);
      setMaterialTitle("");
      setMaterialFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Material Deletion
  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      await deleteMaterial(
        activeCourse!.id, 
        activeChapterId!, 
        materialId, 
        activeTab === "notes" ? "note" : "assignment"
      );
      toast.success("File deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete file");
    }
  };

  // Helper to open PDF
  const openFile = (fileUrl: string) => {
    const fullUrl = fileUrl.startsWith("http")
      ? fileUrl
      : `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api").replace("/api", "")}/uploads/${fileUrl}`;
    window.open(fullUrl, "_blank");
  };

  return (
    <DashboardLayout role={viewerRole}>
      {/* ─── LEVEL 1: Select Class ─── */}
      {!activeClass && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold">Course Management</h2>
            <p className="text-muted-foreground mt-1">Select a class grade to manage subjects and curriculum contents</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {CLASSES.map((cls) => {
              // Count total chapters across all subjects in this class
              const chaptersCount = courses
                .filter((c) => c.classGrade === cls)
                .reduce((acc, curr) => acc + (curr.chapters?.length || 0), 0);

              return (
                <Card 
                  key={cls} 
                  className="p-6 cursor-pointer border border-border/60 hover:border-[#f97316]/50 shadow-card hover:shadow-elevated transition-smooth flex flex-col justify-between"
                  onClick={() => setActiveClass(cls)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-[#f97316]" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-foreground">{cls} Grade</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{chaptersCount} chapters uploaded</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#f97316] font-semibold mt-6 ml-auto">
                    Manage subjects <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── LEVEL 2: Select Subject ─── */}
      {activeClass && !activeSubject && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setActiveClass(null)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back to Classes
            </Button>
            <span className="text-sm font-semibold text-muted-foreground font-mono">Classes / {activeClass} Grade</span>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold">{activeClass} Grade Curriculum</h2>
            <p className="text-muted-foreground mt-1">Select a subject course to manage chapters</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {SUBJECTS.filter((sub) => {
              if (viewerRole === "teacher") {
                return sub.toLowerCase().includes(teacherSubject.toLowerCase()) || teacherSubject.toLowerCase().includes(sub.toLowerCase());
              }
              return true;
            }).map((sub) => {
              const matchingCourse = courses.find(
                (c) => c.classGrade === activeClass && c.subject === sub
              );
              const chaptersCount = matchingCourse?.chapters?.length || 0;

              return (
                <Card 
                  key={sub} 
                  className="p-6 cursor-pointer border border-border/60 hover:border-[#f97316]/50 shadow-card hover:shadow-elevated transition-smooth flex flex-col justify-between"
                  onClick={() => setActiveSubject(sub)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center">
                      <Presentation className="h-6 w-6 text-[#f97316]" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-foreground">{sub}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{chaptersCount} chapters registered</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#f97316] font-semibold mt-6 ml-auto">
                    Open subject <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── LEVEL 3: Select Chapter ─── */}
      {activeClass && activeSubject && !activeChapterId && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setActiveSubject(null)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back to Subjects
            </Button>
            <span className="text-sm font-semibold text-muted-foreground font-mono">
              Classes / {activeClass} / {activeSubject}
            </span>
          </div>

          <div className="grid md:grid-cols-12 gap-6">
            {/* Chapters List */}
            <div className="md:col-span-8 space-y-4">
              <h3 className="font-display font-bold text-lg text-foreground">Chapters</h3>
              
              {!activeCourse?.chapters || activeCourse.chapters.length === 0 ? (
                <Card className="p-8 text-center border-dashed border-2 border-border/60">
                  <BookOpen className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No chapters added yet. Create one on the right to start.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {activeCourse.chapters.map((ch) => {
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
                              {ch.notes?.length || 0} notes • {ch.assignments?.length || 0} assignments
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10 h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (chapterId) handleDeleteChapter(chapterId);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Chapter Form */}
            <div className="md:col-span-4">
              <Card className="p-5 border border-border/60">
                <h3 className="font-display font-bold text-base text-foreground mb-4">Add New Chapter</h3>
                <form onSubmit={handleAddChapter} className="space-y-4">
                  <div>
                    <Label htmlFor="chapterTitle">Chapter Title</Label>
                    <Input 
                      id="chapterTitle"
                      required
                      placeholder="e.g. Chapter 1: Kinematics"
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button type="submit" variant="hero" className="w-full">
                    <Plus className="h-4 w-4 mr-1.5" /> Create Chapter
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ─── LEVEL 4: Chapter Notes & Assignments ─── */}
      {activeClass && activeSubject && activeChapterId && activeChapter && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setActiveChapterId(null)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back to Chapters
            </Button>
            <span className="text-sm font-semibold text-muted-foreground font-mono truncate">
              {activeClass} / {activeSubject} / {activeChapter.title}
            </span>
          </div>

          <div className="grid md:grid-cols-12 gap-6">
            {/* Notes & Assignments Tabs */}
            <div className="md:col-span-8 space-y-4">
              <div className="flex gap-2 border-b border-border">
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

              {/* Items List */}
              {activeTab === "notes" ? (
                <div className="space-y-3">
                  {!activeChapter.notes || activeChapter.notes.length === 0 ? (
                    <Card className="p-8 text-center border-dashed border-2 border-border/60">
                      <FileText className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No notes uploaded for this chapter yet.</p>
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10 h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMaterial(note._id || note.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Card>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {!activeChapter.assignments || activeChapter.assignments.length === 0 ? (
                    <Card className="p-8 text-center border-dashed border-2 border-border/60">
                      <ClipboardList className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No assignments uploaded for this chapter yet.</p>
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10 h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMaterial(ass._id || ass.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Upload File Form */}
            <div className="md:col-span-4">
              <Card className="p-5 border border-border/60">
                <h3 className="font-display font-bold text-base text-foreground mb-4">
                  Upload {activeTab === "notes" ? "Note" : "Assignment"}
                </h3>
                <form onSubmit={handleUploadMaterial} className="space-y-4">
                  <div>
                    <Label htmlFor="materialTitle">Title</Label>
                    <Input 
                      id="materialTitle"
                      required
                      placeholder="e.g. Lecture 1 Notes"
                      value={materialTitle}
                      onChange={(e) => setMaterialTitle(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="materialFile">PDF File</Label>
                    <Input 
                      id="materialFile"
                      ref={fileInputRef}
                      type="file"
                      required
                      accept="application/pdf"
                      onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                      className="mt-1 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-[#f97316] hover:file:bg-orange-100 cursor-pointer"
                    />
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={isUploading}>
                    {isUploading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </span>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-1.5" /> Upload File
                      </>
                    )}
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminCourses;
