"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Bot, X, Send, Minimize2, Maximize2, Trash2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAppData, ResultObj, TimetableObj } from "@/hooks/useAppData";
import { format } from "date-fns";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "");

const SUGGESTIONS_STUDENT = [
  "Show me my results",
  "What exams do I have?",
  "What's my timetable?",
  "Give me study tips",
];

const SUGGESTIONS_OTHER = [
  "How does this platform work?",
  "What can I manage here?",
  "Platform navigation help",
  "Tips for managing students",
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 justify-start mb-4">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#f97316,#f97316)" }}>
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="chat-bubble-ai px-4 py-3 flex items-center gap-1.5">
        <span className="typing-dot" />
        <span className="typing-dot" style={{ animationDelay: "0.2s" }} />
        <span className="typing-dot" style={{ animationDelay: "0.4s" }} />
      </div>
    </div>
  );
}

function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex items-end gap-2.5 mb-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#f97316,#f97316)" }}>
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className={cn(
        "max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
        isUser ? "chat-bubble-user rounded-br-sm text-white" : "chat-bubble-ai rounded-bl-sm text-gray-800"
      )}>
        <span style={{ whiteSpace: "pre-wrap" }}>{msg.text}</span>
        <div className={cn("text-[10px] mt-1 opacity-60", isUser ? "text-white/80 text-right" : "text-gray-400")}>
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-xs font-bold text-gray-600">
          U
        </div>
      )}
    </div>
  );
}

// ─── Build a rich system prompt injecting live student data ───────────────────
function buildSystemPrompt(
  role: string | null,
  userName: string,
  results: ResultObj[],
  exams: any[],
  timetables: TimetableObj[],
  announcements: any[],
): string {
  const isStudent = role === "student";

  // Format results table
  const resultsText = results.length === 0
    ? "No results published yet."
    : results.map((r) =>
        `• ${r.subject} | Score: ${r.score}/${r.maxScore} (${Math.round((r.score / r.maxScore) * 100)}%)` +
        (r.grade ? ` | Grade: ${r.grade}` : "") +
        (r.examType ? ` | Type: ${r.examType}` : "") +
        (r.date ? ` | Date: ${format(new Date(r.date), "MMM d, yyyy")}` : "")
      ).join("\n");

  // Format exams
  const examsText = exams.length === 0
    ? "No exams scheduled."
    : exams.map((e) =>
        `• ${e.title}` +
        (e.starts_at ? ` | Date: ${format(new Date(e.starts_at), "MMM d, yyyy")}` : "") +
        (e.description ? ` | Subject: ${e.description}` : "")
      ).join("\n");

  // Format timetable grouped by day
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const timetableText = timetables.length === 0
    ? "No timetable entries found."
    : days.flatMap((day) => {
        const slots = timetables.filter((t) => t.day?.toLowerCase() === day.toLowerCase());
        if (!slots.length) return [];
        return [`${day}:\n` + slots.map((s) => `  ${s.time} — ${s.subject} (${s.teacher})`).join("\n")];
      }).join("\n") || "No timetable entries found.";

  // Recent announcements
  const announcementsText = announcements.length === 0
    ? "No announcements currently."
    : announcements.slice(0, 5).map((a) => `• ${a.title}: ${a.body || ""}`).join("\n");

  return `You are an AI assistant embedded in "Crafted Learning Hub", an educational management platform.
You are speaking with: ${userName} (Role: ${role ?? "unknown"}).

=== PLATFORM OVERVIEW ===
Crafted Learning Hub is a school management system with:
- Students: view dashboard, timetable, news, recorded classes, exams, results
- Teachers: manage students, classes, exams, results, announcements, timetable
- Admins: full control — students, teachers, courses, exams, results, settings

=== NAVIGATION GUIDE ===
Student routes: /dashboard, /dashboard/timetable, /dashboard/news, /dashboard/classes, /dashboard/exams, /dashboard/results
Teacher routes: /teacher/dashboard, /teacher/students, /teacher/classes, /teacher/exams, /teacher/results, /teacher/announcements, /teacher/timetable
Admin routes: /admin/dashboard, /admin/students, /admin/teachers, /admin/courses, /admin/exams, /admin/results, /admin/announcements, /admin/settings

${isStudent ? `=== ${userName.toUpperCase()}'S RESULTS ===
${resultsText}

=== ${userName.toUpperCase()}'S EXAMS ===
${examsText}

=== ${userName.toUpperCase()}'S TIMETABLE ===
${timetableText}

=== LATEST ANNOUNCEMENTS ===
${announcementsText}` : ""}

=== BEHAVIOUR RULES ===
- When a student asks about their results, exams, or timetable, respond with the EXACT data above — formatted clearly.
- If data shows "No results/exams/timetable", tell the student nothing has been published yet by their teacher.
- Always be encouraging, concise, and friendly.
- For results: show subject, score, percentage, and grade if available.
- For timetable: show day, time, subject, and teacher clearly.
- For exams: show title, subject, and scheduled date.
- Use bullet points and clear formatting in your responses.
- Do NOT make up any data — use only what is provided above.
- If the student asks about a specific subject, filter the relevant entries.
`;
}

export function AIChatbot() {
  const { user, role } = useAuth();
  const { results, exams, timetables, announcements, attempts } = useAppData();

  const userName = user?.full_name || user?.email?.split("@")[0] || "Student";

  // Filter student-specific data
  const myResults = useMemo<ResultObj[]>(() => {
    if (role !== "student" || !user?.id) return [];
    // Official results from backend
    const official = (results || []).filter((r: ResultObj) => r.studentId === user.id);
    // MCQ attempt results
    const fromAttempts = (attempts || [])
      .filter((a) => a.student_id === user.id && a.status === "submitted")
      .map((a) => {
        const exam = exams.find((e) => e.id === a.exam_id);
        return {
          studentId: user.id,
          subject: exam?.title || "Exam",
          examType: "Interactive MCQ",
          score: a.score ?? 0,
          maxScore: a.max_score ?? 0,
          date: a.submitted_at || new Date().toISOString(),
        } as ResultObj;
      });
    return [...official, ...fromAttempts];
  }, [results, attempts, exams, user, role]);

  const myExams = useMemo(() => {
    if (role !== "student") return [];
    return exams || [];
  }, [exams, role]);

  const myTimetable = useMemo<TimetableObj[]>(() => {
    if (role !== "student" || !user?.id) return timetables || [];
    // Filter by studentId if present, else return all
    const filtered = (timetables || []).filter(
      (t: TimetableObj) => !t.studentId || t.studentId === user.id
    );
    return filtered;
  }, [timetables, user, role]);

  // Build system prompt with live data
  const systemPrompt = useMemo(
    () => buildSystemPrompt(role, userName, myResults, myExams, myTimetable, announcements || []),
    [role, userName, myResults, myExams, myTimetable, announcements]
  );

  const SUGGESTIONS = role === "student" ? SUGGESTIONS_STUDENT : SUGGESTIONS_OTHER;

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      text: `👋 Hi ${userName}! I'm your AI assistant. I can answer questions about your results, exams, timetable, and more. How can I help?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelRef = useRef<ReturnType<typeof genAI.getGenerativeModel> | null>(null);

  // Re-create model whenever the system prompt changes (student data loaded/updated)
  useEffect(() => {
    modelRef.current = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt,
    });
  }, [systemPrompt]);

  useEffect(() => {
    if (open) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: text.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      if (!modelRef.current) throw new Error("Model not ready");

      // Build history from all previous messages (skip welcome)
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role as "user" | "model", parts: [{ text: m.text }] }));

      const chat = modelRef.current.startChat({
        history,
        generationConfig: { maxOutputTokens: 1024 },
      });

      const result = await chat.sendMessage(text.trim());
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: result.response.text(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (!open) setHasUnread(true);
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: "Sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const clearChat = () => {
    setMessages([{
      id: "welcome",
      role: "model",
      text: `👋 Hi ${userName}! I'm your AI assistant. I can answer questions about your results, exams, timetable, and more. How can I help?`,
      timestamp: new Date(),
    }]);
  };

  return (
    <>
      <style>{`
        .chat-bubble-user { background: linear-gradient(135deg, #f97316, #f97316); }
        .chat-bubble-ai { background: #f0f4ff; border: 1px solid #e4e8f5; }
        .typing-dot {
          display: inline-block; width: 7px; height: 7px; border-radius: 50%;
          background: #f97316; animation: typingBounce 1.2s infinite ease-in-out;
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        .chatbot-window { animation: chatSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .fab-pulse::before {
          content: ''; position: absolute; inset: -4px; border-radius: 50%;
          background: rgba(249,115,22,0.3); animation: fabPulse 2s infinite;
        }
        @keyframes fabPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50%       { transform: scale(1.3); opacity: 0; }
        }
        .chat-scrollbar::-webkit-scrollbar { width: 4px; }
        .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .chat-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
        .suggestion-chip { transition: all 0.15s ease; }
        .suggestion-chip:hover { background: #f97316; color: white; border-color: #f97316; transform: translateY(-1px); }
      `}</style>

      {/* FAB */}
      <div className="fixed bottom-24 right-4 z-50 md:bottom-6 md:right-6">
        {!open && (
          <div className="relative">
            {hasUnread && (
              <span className="absolute -top-1 -right-1 z-10 w-4 h-4 rounded-full bg-red-500 border-2 border-white text-[9px] text-white flex items-center justify-center font-bold">!</span>
            )}
            <button
              onClick={() => setOpen(true)}
              className="fab-pulse relative w-14 h-14 rounded-full shadow-2xl text-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
              style={{ background: "linear-gradient(135deg, #f97316, #f97316)" }}
              title="Open AI Assistant"
            >
              <Sparkles className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* Chat Window */}
      {open && (
        <div
          className={cn(
            "chatbot-window fixed z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden",
            "bottom-24 right-4 left-4 md:left-auto md:bottom-6 md:right-6",
            minimized ? "h-14" : "h-[75vh] md:w-[370px] md:h-[560px]"
          )}
          style={{ transition: "height 0.2s ease, width 0.2s ease" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: "linear-gradient(135deg, #f97316, #f97316)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm leading-none">AI Assistant</div>
                <div className="text-white/80 text-[10px] mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block" />
                  Powered by Gemini · Knows your data
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearChat} className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors" title="Clear chat">
                <Trash2 className="w-3.5 h-3.5 text-white" />
              </button>
              <button onClick={() => setMinimized((m) => !m)} className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors" title={minimized ? "Expand" : "Minimize"}>
                {minimized ? <Maximize2 className="w-3.5 h-3.5 text-white" /> : <Minimize2 className="w-3.5 h-3.5 text-white" />}
              </button>
              <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors" title="Close">
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>

          {/* Body */}
          {!minimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 chat-scrollbar">
                {messages.map((msg) => <ChatMessage key={msg.id} msg={msg} />)}
                {loading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestion chips — only on fresh chat */}
              {messages.length === 1 && !loading && (
                <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => sendMessage(s)} className="suggestion-chip px-3 py-1 rounded-full border border-[#f97316]/40 text-[#f97316] text-xs font-medium bg-[#f97316]/10">
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="border-t border-gray-100 p-3 shrink-0">
                <div className="flex items-end gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 focus-within:border-[#f97316] focus-within:ring-1 focus-within:ring-[#f97316]/20 transition-all">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about results, exams, timetable…"
                    rows={1}
                    className="flex-1 bg-transparent resize-none text-sm text-gray-700 placeholder-gray-400 outline-none leading-relaxed max-h-24"
                    style={{ minHeight: "24px" }}
                    disabled={loading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-110 active:scale-95"
                    style={{ background: input.trim() && !loading ? "linear-gradient(135deg,#f97316,#f97316)" : "#e5e7eb" }}
                  >
                    <Send className={cn("w-3.5 h-3.5", input.trim() && !loading ? "text-white" : "text-gray-400")} />
                  </button>
                </div>
                <p className="text-center text-[10px] text-gray-400 mt-2">
                  <kbd className="font-mono bg-gray-100 px-1 rounded text-[9px]">Enter</kbd> to send ·{" "}
                  <kbd className="font-mono bg-gray-100 px-1 rounded text-[9px]">Shift+Enter</kbd> for newline
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
