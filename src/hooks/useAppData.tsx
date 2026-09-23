"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import {
  Announcement,
  AttemptAnswer,
  Course,
  createId,
  Exam,
  ExamAttempt,
  initialMockState,
  MockAppState,
  MockUser,
  Question,
  RecordedClass,
} from "@/lib/mockData";
export interface TimetableObj { id?: string; _id?: string; day: string; time: string; subject: string; teacher: string; studentId?: string; batch?: string; }
export interface ResultObj { id?: string; _id?: string; studentId: string; subject: string; examType: string; score: number; maxScore: number; grade?: string; trend?: string; date?: string; }
export interface PaymentObj { id?: string; _id?: string; studentId: string; studentName: string; amount: number; currency?: string; status: "paid" | "pending" | "overdue"; dueDate: string; paidAt?: string; classGrade?: string; batch?: string; razorpayOrderId?: string; razorpayPaymentId?: string; razorpaySignature?: string; paymentMethod?: string; receiptNumber?: string; created_at?: string; }
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "./useAuth";

interface CreateUserInput {
  email: string;
  full_name: string;
  role: MockUser["role"];
  course?: string;
  batch?: string;
  phone?: string;
  subject?: string;
  linkedStudentId?: string;
  relationship?: string;
  profilePhoto?: string;
  password?: string;
  assignedCourses?: string[];
  classLink?: string;
}

interface UpdateUserInput {
  id: string;
  email?: string;
  full_name?: string;
  password?: string;
  role: MockUser["role"];
  course?: string;
  batch?: string;
  phone?: string;
  subject?: string;
  linkedStudentId?: string;
  relationship?: string;
  profilePhoto?: string;
  assignedCourses?: string[];
  classLink?: string;
}

interface CreateCourseInput {
  name: string;
  description: string;
}

interface CreateClassInput {
  title: string;
  description: string;
  youtube_id: string;
  course_id: string | null;
}

interface CreateAnnouncementInput {
  title: string;
  body: string;
  is_global: boolean;
}

interface CreateExamInput {
  file: File | null;
  studentId: string | null;
  title: string;
  description: string;
  exam_type: string;
  duration_minutes: number;
  starts_at: string | null;
  course_id: string | null;
}

interface CreateQuestionInput {
  exam_id: string;
  question_text: string;
  question_type: Question["question_type"];
  marks: number;
  options: string[] | null;
  correct_answer: string | null;
}

interface SubmitExamInput {
  attemptId: string;
  answers: Record<string, string>;
}

interface AppDataContextValue extends MockAppState {
  isLoading: boolean;
  createUser: (input: CreateUserInput) => Promise<any>;
  deleteUser: (id: string, role?: string) => Promise<void>;
  updateUser: (input: UpdateUserInput) => Promise<void>;
  createCourse: (input: CreateCourseInput) => void;
  deleteCourse: (id: string) => void;
  updateCourse: (id: string, input: Partial<CreateCourseInput>) => void;
  addChapter: (courseId: string, title: string) => Promise<any>;
  deleteChapter: (courseId: string, chapterId: string) => Promise<any>;
  uploadMaterial: (courseId: string, chapterId: string, payload: FormData) => Promise<any>;
  deleteMaterial: (courseId: string, chapterId: string, materialId: string, type: "note" | "assignment") => Promise<any>;
  createClass: (input: CreateClassInput) => void;
  deleteClass: (id: string) => void;
  updateClass: (id: string, input: Partial<CreateClassInput>) => void;
  createAnnouncement: (input: CreateAnnouncementInput) => void;
  deleteAnnouncement: (id: string) => void;
  updateAnnouncement: (id: string, input: Partial<CreateAnnouncementInput>) => void;
  createExam: (input: CreateExamInput) => Promise<string>;
  deleteExam: (id: string) => void;
  updateExam: (id: string, input: Partial<CreateExamInput>) => void;
  createQuestion: (input: CreateQuestionInput) => void;
  deleteQuestion: (id: string) => void;
  getOrCreateAttempt: (examId: string, studentId: string) => ExamAttempt;
  saveAnswer: (attemptId: string, questionId: string, answer: string) => void;
  submitExam: (input: SubmitExamInput) => void;
  results: ResultObj[];
  timetables: TimetableObj[];
  createTimetable: (input: TimetableObj) => void;
  deleteTimetable: (id: string) => void;
  updateTimetable: (id: string, input: Partial<TimetableObj>) => void;
  createResult: (res: ResultObj) => void;
  deleteResult: (id: string) => void;
  updateResult: (id: string, res: Partial<ResultObj>) => void;
  payments: PaymentObj[];
  createPayment: (input: PaymentObj) => void;
  deletePayment: (id: string) => void;
  updatePayment: (id: string, input: Partial<PaymentObj>) => void;
}

const STORAGE_KEY = "ui-only-school-app";
const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

const loadState = (): MockAppState => {
  if (typeof window === "undefined") return initialMockState;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialMockState;
  try {
    const parsed = JSON.parse(raw) as MockAppState;
    // Strip out any legacy dummy/mock exams that start with 'exam-' or have id '123'
    if (Array.isArray(parsed.exams)) {
      parsed.exams = parsed.exams.filter(
        (e: any) => e && e.id && !e.id.startsWith("exam-") && e.id !== "123"
      );
    }
    return parsed;
  } catch {
    return initialMockState;
  }
};

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<MockAppState>(() => {
    if (typeof window !== "undefined") {
      const cached = loadState();
      if (cached && cached.users && cached.users.length > 0) return cached;
    }
    return { ...initialMockState };
  });
  const [payments, setPayments] = useState<PaymentObj[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { session } = useAuth();
  
  useEffect(() => {
    if (!session?.access_token) {
      setIsLoading(false);
      return;
    }
    
    // Fetch fresh state from backend in background
    const fetchAll = async () => {
      try {
        setIsLoading(true);
        let students: any[] = [];
        let teachers: any[] = [];
        let parents: any[] = [];
        let courses: any[] = [];
        let announcements: any[] = [];
        let exams: any[] = [];
        let classes: any[] = [];
        let results: any[] = [];
        let timetables: any[] = [];
        let loadedPayments: any[] = [];

        try {
          const bootstrap = await apiClient<any>("/bootstrap");
          students = bootstrap.students || [];
          teachers = bootstrap.teachers || [];
          parents = bootstrap.parents || [];
          courses = bootstrap.courses || [];
          announcements = bootstrap.announcements || [];
          exams = bootstrap.exams || [];
          classes = bootstrap.classes || [];
          results = bootstrap.results || [];
          timetables = bootstrap.timetables || [];
          loadedPayments = bootstrap.payments || [];
        } catch {
          const res = await Promise.all([
            apiClient<any[]>("/students").catch(() => []),
            apiClient<any[]>("/admin/teachers").catch(() => []),
            apiClient<any[]>("/parents").catch(() => []),
            apiClient<any[]>("/courses").catch(() => []),
            apiClient<any[]>("/announcements").catch(() => []),
            apiClient<any[]>("/exams").catch(() => []),
            apiClient<any[]>("/classes").catch(() => []),
            apiClient<any[]>("/results").catch(() => []),
            apiClient<any[]>("/timetable").catch(() => []),
            apiClient<any[]>("/payments").catch(() => []),
          ]);
          students = res[0]; teachers = res[1]; parents = res[2]; courses = res[3];
          announcements = res[4]; exams = res[5]; classes = res[6]; results = res[7];
          timetables = res[8]; loadedPayments = res[9];
        }
        
        const combinedUsers = [
          ...(students || []).map((u: any) => ({
            id: u._id || u.studentId,
            studentId: u.studentId || "",
            email: u.email,
            full_name: u.name,
            role: "student" as const,
            created_at: u.createdAt || new Date().toISOString(),
            course: u.course || "General",
            phone: u.phone || "",
            batch: u.batch || "Batch 1",
            profilePhoto: u.profilePhoto || "",
            classLink: u.classLink || "",
            assignedCourses: u.assignedCourses || ["Physics", "Chemistry", "Biology", "Mathematics"]
          })),
          ...(teachers || []).map((u: any) => ({
            id: u._id,
            email: u.email,
            full_name: u.name,
            role: "teacher" as const,
            created_at: u.createdAt || new Date().toISOString(),
            phone: u.phone || "",
            subject: u.subject || "Physics"
          })),
          ...(parents || []).map((u: any) => ({
            id: u._id || u.id,
            email: u.email,
            full_name: u.name,
            role: "parent" as const,
            created_at: u.createdAt || new Date().toISOString(),
            phone: u.phone || "",
            linkedStudentId: u.student?._id || u.student?.id || u.student,
            relationship: u.relationship || "Parent"
          }))
        ];

        setPayments(loadedPayments || []);

        setState(prev => ({
          ...prev,
          users: combinedUsers,
          courses: (courses && courses.length > 0) ? courses.map(c => ({
            id: c._id || c.id,
            _id: c._id,
            classGrade: c.classGrade,
            subject: c.subject,
            chapters: c.chapters || [],
            created_at: c.createdAt || new Date().toISOString()
          })) : [],
          announcements: (announcements && announcements.length > 0) ? announcements.map(a => ({
            id: a._id,
            title: a.title,
            body: a.content || a.message || a.body || "",
            is_global: true,
            created_at: a.createdAt || new Date().toISOString()
          })) : [],
          recordedClasses: (classes && classes.length > 0) ? classes.map((c: any) => ({
            id: c._id,
            title: c.title,
            description: c.description,
            youtube_id: c.youtube_id,
            course_id: c.course_id,
            created_at: c.createdAt || new Date().toISOString()
          })) : [],
          timetables: timetables || [],
          results: results || [],
          exams: (exams && exams.length > 0) ? exams.map((e: any) => ({
            id: e._id || e.id,
            _id: e._id || e.id,
            title: e.title,
            description: e.subject || e.description || "",
            subject: e.subject || e.description || "",
            exam_type: e.exam_type || "unit_test",
            duration_minutes: e.duration_minutes || 60,
            starts_at: e.starts_at || e.date || null,
            studentId: e.studentId || null,
            course_id: e.course_id || null,
            pdf: e.pdf,
            questions: e.questions || [],
            created_at: e.createdAt || new Date().toISOString()
          })) : [],
          questions: (exams && exams.length > 0) ? exams.flatMap((e: any) => (e.questions || []).map((q: any) => ({
            ...q,
            exam_id: e._id || e.id,
          }))) : [],
        }));
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch initial state", err);
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [session?.access_token]);

  // Sync state to local storage is kept for mock fallback features
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);


  const value = useMemo<AppDataContextValue>(() => ({
    ...state,
    isLoading,
    createUser: async (input) => {
      try {
        const password = input.password || "password123"; // default fallback for local mock
        let endpoint = input.role === "teacher" ? "/admin/teachers" : input.role === "parent" ? "/parents" : "/students";
        let body: any = { password, email: input.email, name: input.full_name };
        if (input.role === "student") {
          body.course = input.course || "10th";
          body.batch = input.batch || "Batch 1";
          body.phone = input.phone || "";
          body.classLink = input.classLink || "";
          body.assignedCourses = input.assignedCourses || ["Physics", "Chemistry", "Biology", "Mathematics"];
        } else {
          body.phone = input.phone || "";
          body.subject = input.subject || "Physics";
        }
        if (input.role === "parent") {
          body.username = input.email;
          body.phone = input.phone || "";
          body.studentId = input.linkedStudentId;
          body.relationship = input.relationship || "Parent";
        }
        const res = await apiClient<any>(endpoint, { method: "POST", body: JSON.stringify(body) });
        
        const actualId = (res.student?._id || res.teacher?._id || res._id || res.id) || createId("user");
        
        setState((prev) => ({
          ...prev,
          users: [
            {
              id: actualId,
              studentId: res.student?.studentId || "",
              email: input.email,
              full_name: input.full_name,
              role: input.role,
              created_at: new Date().toISOString(),
              course: input.course || (input.role === "student" ? "10th" : undefined),
              batch: input.batch || (input.role === "student" ? "Batch 1" : undefined),
              phone: input.phone || "",
              subject: input.subject || (input.role === "teacher" ? "Physics" : undefined),
              linkedStudentId: input.linkedStudentId,
              relationship: input.relationship,
              classLink: res.student?.classLink || input.classLink || "",
              assignedCourses: res.student?.assignedCourses || input.assignedCourses || ["Physics", "Chemistry", "Biology", "Mathematics"],
            },
            ...prev.users,
          ],
        }));
        return res;
      } catch (err) {
        console.error(err);
        throw err;
      }
    },
    deleteUser: async (id, role: any) => {
      try {
        if (role) {
           let endpoint = role === "teacher" ? `/admin/teachers/${id}` : role === "parent" ? `/parents/${id}` : `/students/${id}`;
           await apiClient(endpoint, { method: "DELETE" }).catch(console.error);
        }
      } catch (e) { throw e; }
      setState((prev) => ({
        ...prev,
        users: prev.users.filter((user) => user.id !== id),
        attempts: prev.attempts.filter((attempt) => attempt.student_id !== id),
      }));
    },
    updateUser: async (input) => {
      try {
        let endpoint = input.role === "teacher" ? `/admin/teachers/${input.id}` : input.role === "parent" ? `/parents/${input.id}` : `/students/${input.id}`;
        let body: any = {};
        if (input.email !== undefined) body.email = input.email;
        if (input.full_name !== undefined) body.name = input.full_name;
        if (input.password !== undefined) body.password = input.password;
        if (input.phone !== undefined) body.phone = input.phone;
        if (input.course !== undefined) body.course = input.course;
        if (input.batch !== undefined) body.batch = input.batch;
        if (input.subject !== undefined) body.subject = input.subject;
        if (input.profilePhoto !== undefined) body.profilePhoto = input.profilePhoto;
        if (input.linkedStudentId !== undefined) body.studentId = input.linkedStudentId;
        if (input.relationship !== undefined) body.relationship = input.relationship;
        if (input.classLink !== undefined) body.classLink = input.classLink;
        if (input.role === "parent") body.username = input.email;
        if (input.assignedCourses !== undefined) body.assignedCourses = input.assignedCourses;
        
        await apiClient<any>(endpoint, { method: "PATCH", body: JSON.stringify(body) });
        
        setState((prev) => ({
          ...prev,
          users: prev.users.map(u => u.id === input.id ? { 
              ...u, 
              email: input.email !== undefined ? input.email : u.email, 
              full_name: input.full_name !== undefined ? input.full_name : u.full_name,
              phone: input.phone !== undefined ? input.phone : u.phone,
              course: input.course !== undefined ? input.course : u.course,
              batch: input.batch !== undefined ? input.batch : u.batch,
              subject: input.subject !== undefined ? input.subject : u.subject,
              profilePhoto: input.profilePhoto !== undefined ? input.profilePhoto : u.profilePhoto,
              linkedStudentId: input.linkedStudentId !== undefined ? input.linkedStudentId : u.linkedStudentId,
              relationship: input.relationship !== undefined ? input.relationship : u.relationship,
              classLink: input.classLink !== undefined ? input.classLink : u.classLink,
              assignedCourses: input.assignedCourses !== undefined ? input.assignedCourses : u.assignedCourses,
            } : u)
        }));
      } catch (err) {
        console.error(err);
        throw err;
      }
    },
    createCourse: async (input) => {
      try {
        const res = await apiClient<any>("/courses", {
          method: "POST",
          body: JSON.stringify({ name: input.name, description: input.description, duration:"1 month", color:"blue" })
        });
        setState((prev) => ({
          ...prev,
          courses: [
            {
              id: res.course?._id || createId("course"),
              name: input.name,
              description: input.description,
              created_at: new Date().toISOString(),
            },
            ...prev.courses,
          ],
        }));
      } catch (err) {
        console.error("Create course failed", err);
      }
    },
    deleteCourse: async (id) => {
      try {
        await apiClient(`/courses/${id}`, { method: "DELETE" });
      } catch (e) { console.error(e); }
      setState((prev) => ({
        ...prev,
        courses: prev.courses.filter((course) => course.id !== id),
      }));
    },
    updateCourse: async (id, input) => {
      try { await apiClient(`/courses/${id}`, { method: "PATCH", body: JSON.stringify(input) }); } catch(e) {}
      setState((prev) => ({
        ...prev,
        courses: prev.courses.map((item) => item.id === id ? { ...item, ...input } : item),
      }));
    },
    addChapter: async (courseId, title) => {
      const res = await apiClient<any>(`/courses/${courseId}/chapters`, {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      setState((prev) => ({
        ...prev,
        courses: prev.courses.map((c) =>
          c.id === courseId ? { ...c, chapters: res.course?.chapters || c.chapters } : c
        ),
      }));
      return res;
    },
    deleteChapter: async (courseId, chapterId) => {
      const res = await apiClient<any>(`/courses/${courseId}/chapters/${chapterId}`, {
        method: "DELETE",
      });
      setState((prev) => ({
        ...prev,
        courses: prev.courses.map((c) =>
          c.id === courseId ? { ...c, chapters: res.course?.chapters || c.chapters } : c
        ),
      }));
      return res;
    },
    uploadMaterial: async (courseId, chapterId, payload) => {
      const res = await apiClient<any>(`/courses/${courseId}/chapters/${chapterId}/upload`, {
        method: "POST",
        body: payload,
      });
      setState((prev) => ({
        ...prev,
        courses: prev.courses.map((c) =>
          c.id === courseId ? { ...c, chapters: res.course?.chapters || c.chapters } : c
        ),
      }));
      return res;
    },
    deleteMaterial: async (courseId, chapterId, materialId, type) => {
      const res = await apiClient<any>(`/courses/${courseId}/chapters/${chapterId}/materials/${materialId}?type=${type}`, {
        method: "DELETE",
      });
      setState((prev) => ({
        ...prev,
        courses: prev.courses.map((c) =>
          c.id === courseId ? { ...c, chapters: res.course?.chapters || c.chapters } : c
        ),
      }));
      return res;
    },
    createClass: async (input) => {
      try {
        const res = await apiClient<any>("/classes", {
          method: "POST",
          body: JSON.stringify({
            title: input.title,
            description: input.description,
            youtube_id: input.youtube_id,
            course_id: input.course_id
          })
        });
        
        setState((prev) => ({
          ...prev,
          recordedClasses: [
            {
              id: res._id || createId("class"),
              title: input.title,
              description: input.description,
              youtube_id: input.youtube_id,
              course_id: input.course_id,
              created_at: new Date().toISOString(),
            },
            ...prev.recordedClasses,
          ],
        }));
      } catch(e) { }
    },
    deleteClass: async (id) => {
      try {
        await apiClient(`/classes/${id}`, { method: "DELETE" }).catch(console.error);
      } catch(e) {}
      setState((prev) => ({
        ...prev,
        recordedClasses: prev.recordedClasses.filter((item) => item.id !== id),
      }));
    },
    updateClass: async (id, input) => {
      try { await apiClient(`/classes/${id}`, { method: "PUT", body: JSON.stringify(input) }); } catch(e) {}
      setState((prev) => ({
        ...prev,
        recordedClasses: prev.recordedClasses.map((item) => item.id === id ? { ...item, ...input } : item),
      }));
    },
    createAnnouncement: async (input) => {
      try {
        const payload = { title: input.title, content: input.body, priority: input.is_global ? "high" : "medium" };
        const res = await apiClient<any>("/announcements", { method: "POST", body: JSON.stringify(payload) });
        setState((prev) => ({
          ...prev,
          announcements: [
            {
              id: res._id || createId("announcement"),
              title: input.title,
              body: input.body,
              is_global: input.is_global,
              created_at: new Date().toISOString(),
            },
            ...prev.announcements,
          ],
        }));
      } catch (e) {}
    },
    deleteAnnouncement: async (id) => {
      try { await apiClient(`/announcements/${id}`, { method: "DELETE" }); } catch(e) {}
      setState((prev) => ({
        ...prev,
        announcements: prev.announcements.filter((item) => item.id !== id),
      }));
    },
    updateAnnouncement: async (id, input) => {
      try { 
        const payload = { title: input.title, content: input.body, priority: input.is_global ? "high" : "medium" };
        await apiClient(`/announcements/${id}`, { method: "PUT", body: JSON.stringify(payload) }); 
      } catch(e) {}
      setState((prev) => ({
        ...prev,
        announcements: prev.announcements.map((item) => item.id === id ? { ...item, ...input } : item),
      }));
    },
    createExam: async (input) => {
      try {
        let res: any;
        if (input.file) {
          const formData = new FormData();
          formData.append("title", input.title);
          formData.append("subject", input.description || "General");
          formData.append("exam_type", input.exam_type || "unit_test");
          formData.append("duration_minutes", String(input.duration_minutes || 60));
          if (input.starts_at) formData.append("starts_at", input.starts_at);
          if (input.studentId) formData.append("studentId", input.studentId);
          formData.append("pdf", input.file);
          
          res = await apiClient<any>("/exams", {
            method: "POST",
            body: formData,
          });
        } else {
          res = await apiClient<any>("/exams", {
            method: "POST",
            body: JSON.stringify({
              title: input.title,
              subject: input.description || "General",
              exam_type: input.exam_type || "unit_test",
              duration_minutes: input.duration_minutes || 60,
              starts_at: input.starts_at || null,
              studentId: input.studentId || null,
            }),
          });
        }

        const created = res.exam || res;
        const examId = created._id || created.id || createId("exam");

        const newExam: Exam = {
          id: examId,
          title: created.title || input.title,
          description: created.subject || input.description || "",
          exam_type: created.exam_type || input.exam_type || "unit_test",
          duration_minutes: created.duration_minutes || input.duration_minutes || 60,
          starts_at: created.starts_at || input.starts_at || null,
          course_id: input.course_id || null,
          pdf: created.pdf,
          created_at: created.createdAt || new Date().toISOString(),
        };
        (newExam as any).studentId = created.studentId || input.studentId || null;
        (newExam as any).questions = created.questions || [];

        setState((prev) => ({
          ...prev,
          exams: [newExam, ...prev.exams.filter((e) => e.id !== "123" && e.id !== examId)],
        }));
        return examId;
      } catch (e) {
        console.error("Failed to create exam:", e);
        throw e;
      }
    },
    createResult: async (input) => { 
        try {
            const res = await apiClient<any>("/results/add", { method: "POST", body: JSON.stringify(input) });
            setState(prev => ({ ...prev, results: [res.result, ...prev.results] }));
        } catch(e){}
    },
    deleteResult: async (id) => {
        try {
            await apiClient(`/results/delete/${id}`, { method: "DELETE" });
            setState(prev => ({ ...prev, results: prev.results.filter((r: any) => r._id !== id && r.id !== id) }));
        } catch(e){}
    },
    updateResult: async (id, input) => {
        try {
            await apiClient(`/results/edit/${id}`, { method: "PUT", body: JSON.stringify(input) });
            setState((prev) => ({
              ...prev,
              results: prev.results.map((r: any) => (r._id === id || r.id === id) ? { ...r, ...input } : r),
            }));
        } catch(e){}
    },
    createTimetable: async (input) => {
      try {
        const res = await apiClient<any>("/timetable", { method: "POST", body: JSON.stringify(input) });
        setState(prev => ({ ...prev, timetables: [res, ...prev.timetables] }));
      } catch(e){}
    },
    deleteTimetable: async (id) => {
      try {
        await apiClient(`/timetable/${id}`, { method: "DELETE" });
        setState(prev => ({ ...prev, timetables: prev.timetables.filter((t: any) => t._id !== id && t.id !== id) }));
      } catch(e){}
    },
    updateTimetable: async (id, input) => {
      try {
        await apiClient(`/timetable/${id}`, { method: "PUT", body: JSON.stringify(input) });
        setState(prev => ({ 
          ...prev, 
          timetables: prev.timetables.map((t: any) => (t._id === id || t.id === id) ? { ...t, ...input } : t) 
        }));
      } catch(e){}
    },
    deleteExam: async (id) => {
      try {
        await apiClient(`/exams/${id}`, { method: "DELETE" });
      } catch (e) {
        console.error("Failed to delete exam:", e);
      }
      setState((prev) => {
        const attemptIds = prev.attempts.filter((attempt) => attempt.exam_id === id).map((attempt) => attempt.id);
        return {
          ...prev,
          exams: prev.exams.filter((exam) => exam.id !== id && (exam as any)._id !== id),
          questions: prev.questions.filter((question) => question.exam_id !== id),
          attempts: prev.attempts.filter((attempt) => attempt.exam_id !== id),
          attemptAnswers: prev.attemptAnswers.filter((answer) => !attemptIds.includes(answer.attempt_id)),
        };
      });
    },
    updateExam: async (id, input) => {
      try { 
        const payload: any = {
          title: input.title,
          subject: input.description,
          description: input.description,
          exam_type: input.exam_type,
          duration_minutes: input.duration_minutes,
          starts_at: input.starts_at,
          date: input.starts_at,
          studentId: input.studentId,
        };
        await apiClient(`/exams/${id}`, { method: "PUT", body: JSON.stringify(payload) }); 
      } catch (e) {
        console.error("Failed to update exam:", e);
      }
      setState((prev) => ({
        ...prev,
        exams: prev.exams.map((item) => (item.id === id || (item as any)._id === id) ? { ...item, ...input } : item),
      }));
    },
    createQuestion: async (input) => {
      const qId = createId("question");
      try {
        await apiClient(`/exams/${input.exam_id}/questions`, {
          method: "POST",
          body: JSON.stringify({ ...input, id: qId }),
        });
      } catch (err) {
        console.error("Failed to persist question to DB:", err);
      }
      setState((prev) => {
        const position = prev.questions.filter((question) => question.exam_id === input.exam_id).length;
        const newQ: Question = {
          id: qId,
          exam_id: input.exam_id,
          question_text: input.question_text,
          question_type: input.question_type,
          marks: input.marks,
          options: input.options,
          correct_answer: input.correct_answer,
          position,
        };
        return {
          ...prev,
          questions: [...prev.questions, newQ],
          exams: prev.exams.map((e) => {
            if (e.id === input.exam_id || (e as any)._id === input.exam_id) {
              return { ...e, questions: [...((e as any).questions || []), newQ] };
            }
            return e;
          }),
        };
      });
    },
    deleteQuestion: async (id) => {
      let targetExamId = "";
      setState((prev) => {
        const targetQ = prev.questions.find((q) => q.id === id);
        if (targetQ) targetExamId = targetQ.exam_id;
        return {
          ...prev,
          questions: prev.questions.filter((question) => question.id !== id),
          attemptAnswers: prev.attemptAnswers.filter((answer) => answer.question_id !== id),
          exams: prev.exams.map((e) => {
            if (e.id === targetExamId || (e as any)._id === targetExamId) {
              return {
                ...e,
                questions: ((e as any).questions || []).filter((q: any) => q.id !== id),
              };
            }
            return e;
          }),
        };
      });
      if (targetExamId) {
        try {
          await apiClient(`/exams/${targetExamId}/questions?questionId=${id}`, { method: "DELETE" });
        } catch (err) {
          console.error("Failed to delete question from DB:", err);
        }
      }
    },
    getOrCreateAttempt: (examId, studentId) => {
      let nextAttempt: ExamAttempt | undefined;
      setState((prev) => {
        const existing = prev.attempts.find(
          (attempt) => attempt.exam_id === examId && attempt.student_id === studentId,
        );
        if (existing) {
          nextAttempt = existing;
          return prev;
        }
        nextAttempt = {
          id: createId("attempt"),
          exam_id: examId,
          student_id: studentId,
          status: "in_progress",
          started_at: new Date().toISOString(),
          submitted_at: null,
          score: null,
          max_score: null,
        };
        return {
          ...prev,
          attempts: [...prev.attempts, nextAttempt],
        };
      });
      return nextAttempt!;
    },
    saveAnswer: (attemptId, questionId, answer) => {
      setState((prev) => {
        const existing = prev.attemptAnswers.find(
          (item) => item.attempt_id === attemptId && item.question_id === questionId,
        );
        if (existing) {
          return {
            ...prev,
            attemptAnswers: prev.attemptAnswers.map((item) =>
              item.id === existing.id ? { ...item, answer } : item,
            ),
          };
        }
        return {
          ...prev,
          attemptAnswers: [
            ...prev.attemptAnswers,
            {
              id: createId("answer"),
              attempt_id: attemptId,
              question_id: questionId,
              answer,
              awarded_marks: null,
            },
          ],
        };
      });
    },
    submitExam: ({ attemptId, answers }) => {
      setState((prev) => {
        const attempt = prev.attempts.find((item) => item.id === attemptId);
        if (!attempt) return prev;
        const examObj = prev.exams.find((e) => e.id === attempt.exam_id || (e as any)._id === attempt.exam_id);
        const examQuestions = prev.questions.filter((question) => question.exam_id === attempt.exam_id);
        const allQ = examQuestions.length > 0 ? examQuestions : ((examObj as any)?.questions || []);

        let score = 0;
        const maxScore = allQ.reduce((sum: number, question: any) => sum + Number(question.marks), 0) || 100;
        const updatedAnswers: AttemptAnswer[] = prev.attemptAnswers.map((item) => {
          const question = allQ.find((entry: any) => entry.id === item.question_id);
          if (!question || item.attempt_id !== attemptId) return item;
          if (question.question_type !== "mcq") return { ...item, answer: answers[item.question_id] ?? item.answer };
          const awarded = question.correct_answer === (answers[item.question_id] ?? item.answer) ? Number(question.marks) : 0;
          score += awarded;
          return {
            ...item,
            answer: answers[item.question_id] ?? item.answer,
            awarded_marks: awarded,
          };
        });

        // Persist official result to database
        const percent = Math.round((score / maxScore) * 100);
        const grade = percent >= 90 ? "A+" : percent >= 75 ? "A" : percent >= 50 ? "B" : "C";
        apiClient<any>("/results/add", {
          method: "POST",
          body: JSON.stringify({
            studentId: attempt.student_id,
            subject: examObj?.title || examObj?.description || "Exam",
            examType: examObj?.exam_type || "Interactive MCQ",
            score,
            maxScore,
            date: new Date().toISOString(),
            grade,
            trend: "stable",
          }),
        }).then((res) => {
          if (res?.result) {
            setState((p) => ({ ...p, results: [res.result, ...p.results] }));
          }
        }).catch(console.error);

        return {
          ...prev,
          attemptAnswers: updatedAnswers,
          attempts: prev.attempts.map((item) =>
            item.id === attemptId
              ? {
                  ...item,
                  status: "submitted",
                  submitted_at: new Date().toISOString(),
                  score,
                  max_score: maxScore,
                }
              : item,
          ),
        };
      });
    },
    payments,
    createPayment: async (input) => {
      try {
        const res = await apiClient<any>("/payments", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setPayments((prev) => [res, ...prev]);
      } catch (e) {
        setPayments((prev) => [{ ...input, id: createId("pay") }, ...prev]);
      }
    },
    deletePayment: async (id) => {
      try {
        await apiClient(`/payments/${id}`, { method: "DELETE" });
        setPayments((prev) => prev.filter((p) => p._id !== id && p.id !== id));
      } catch (e) {
        setPayments((prev) => prev.filter((p) => p._id !== id && p.id !== id));
      }
    },
    updatePayment: async (id, input) => {
      try {
        const res = await apiClient<any>(`/payments/${id}`, {
          method: "PUT",
          body: JSON.stringify(input),
        });
        setPayments((prev) =>
          prev.map((p) => (p._id === id || p.id === id ? { ...p, ...res } : p))
        );
      } catch (e) {
        setPayments((prev) =>
          prev.map((p) => (p._id === id || p.id === id ? { ...p, ...input } : p))
        );
      }
    },
  }), [state, payments, isLoading]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used within AppDataProvider");
  return context;
};
