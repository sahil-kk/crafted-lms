export type AppRole = "admin" | "teacher" | "student" | "parent";

export interface MockUser {
  id: string;
  studentId?: string;
  email: string;
  role: AppRole;
  full_name: string;
  created_at: string;
  course?: string;
  batch?: string;
  phone?: string;
  profilePhoto?: string;
  subject?: string;
  assignedStudents?: string[];
  linkedStudentId?: string;
  relationship?: string;
  assignedCourses?: string[];
  classLink?: string;
}

export interface NoteObj {
  _id?: string;
  id?: string;
  title: string;
  fileUrl: string;
  createdAt?: string;
}

export interface AssignmentObj {
  _id?: string;
  id?: string;
  title: string;
  fileUrl: string;
  createdAt?: string;
}

export interface ChapterObj {
  _id?: string;
  id?: string;
  title: string;
  notes: NoteObj[];
  assignments: AssignmentObj[];
}

export interface Course {
  id: string;
  _id?: string;
  name?: string;
  description?: string;
  classGrade?: string;
  subject?: string;
  chapters?: ChapterObj[];
  created_at?: string;
}

export interface RecordedClass {
  id: string;
  title: string;
  description: string;
  youtube_id: string;
  course_id: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  is_global: boolean;
  created_at: string;
}

export interface Exam {
  id: string;
  _id?: string;
  title: string;
  description: string;
  subject?: string;
  exam_type: string;
  duration_minutes: number;
  starts_at: string | null;
  course_id: string | null;
  studentId?: string | null;
  questions?: Question[];
  pdf?: string;
  created_at: string;
}

export interface Question {
  id: string;
  exam_id: string;
  question_text: string;
  question_type: "mcq" | "short" | "long";
  marks: number;
  options: string[] | null;
  correct_answer: string | null;
  position: number;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  status: "in_progress" | "submitted";
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  max_score: number | null;
}

export interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  answer: string;
  awarded_marks: number | null;
}

export interface MockAppState {
  users: MockUser[];
  courses: Course[];
  recordedClasses: RecordedClass[];
  announcements: Announcement[];
  exams: Exam[];
  questions: Question[];
  attempts: ExamAttempt[];
  attemptAnswers: AttemptAnswer[];
  results: any[];
  timetables: any[];
}

export const createId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export const initialMockState: MockAppState = {
  users: [],
  courses: [],
  recordedClasses: [],
  announcements: [],
  exams: [],
  questions: [],
  attempts: [],
  attemptAnswers: [],
  results: [],
  timetables: [],
};
