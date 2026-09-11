"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { AppRole, MockUser } from "@/lib/mockData";
import { apiClient, setAuthToken, removeAuthToken, getAuthToken } from "@/lib/apiClient";
import { jwtDecode } from "jwt-decode";

export type { AppRole };

interface Session {
  access_token: string;
  user: MockUser;
}

interface AuthContextValue {
  user: MockUser | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (role: AppRole, identifier: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "ui-only-auth";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

interface StoredAuth {
  user: MockUser;
  savedAt?: number;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<MockUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from local storage initially
  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const token = getAuthToken();
    if (raw && token) {
      try {
        const stored = JSON.parse(raw) as StoredAuth;
        const savedAt = stored.savedAt || 0;
        const isExpired = Date.now() - savedAt > SESSION_TTL_MS;
        if (!stored.user || isExpired) {
          window.localStorage.removeItem(STORAGE_KEY);
          removeAuthToken();
          setLoading(false);
          return;
        }
        setUser(stored.user);
        setRole(stored.user.role);
        setSession({ access_token: token, user: stored.user });
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        removeAuthToken();
      }
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      removeAuthToken();
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session) return;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    let savedAt = Date.now();
    try {
      const stored = raw ? JSON.parse(raw) as StoredAuth : null;
      savedAt = stored?.savedAt || savedAt;
    } catch {
      savedAt = Date.now();
    }

    const remainingMs = SESSION_TTL_MS - (Date.now() - savedAt);
    if (remainingMs <= 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      removeAuthToken();
      setUser(null);
      setSession(null);
      setRole(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      window.localStorage.removeItem(STORAGE_KEY);
      removeAuthToken();
      setUser(null);
      setSession(null);
      setRole(null);
    }, remainingMs);

    return () => window.clearTimeout(timeout);
  }, [session]);

  const signIn = async (nextRole: AppRole, identifier: string, password?: string) => {
    const pass = password || "password123"; // Fallback for UI if empty initially

    let data: any;
    try {
      if (nextRole === "student") {
        data = await apiClient<{ token: string; role: string; student: any }>("/auth/student-login", {
          method: "POST",
          body: JSON.stringify({ studentId: identifier, password: pass }),
        });
      } else if (nextRole === "parent") {
        data = await apiClient<{ token: string; role: string; parent: any; student: any }>("/auth/parent-login", {
          method: "POST",
          body: JSON.stringify({ username: identifier, password: pass }),
        });
      } else if (nextRole === "teacher") {
        data = await apiClient<{ token: string; role: string }>("/auth/teacher-login", {
          method: "POST",
          body: JSON.stringify({ username: identifier, password: pass }),
        });
      } else {
        data = await apiClient<{ token: string; role: string }>("/auth/admin-login", {
          method: "POST",
          body: JSON.stringify({ username: identifier, password: pass }),
        });
      }
    } catch (err: any) {
      throw new Error(err.message || "Failed to log in");
    }

    setAuthToken(data.token);

    // Normalize user to match MockUser interface
    let nextUser: MockUser;
    
    if (nextRole === "student" && data.student) {
      nextUser = {
        id: data.student._id || data.student.id || data.student.studentId || identifier,
        email: data.student.email || `${identifier}@example.com`,
        role: "student",
        full_name: data.student.name || identifier,
        created_at: new Date().toISOString(),
        studentId: data.student.studentId,
        course: data.student.course,
        batch: data.student.batch,
        phone: data.student.phone || "",
        profilePhoto: data.student.profilePhoto || "",
        classLink: data.student.classLink || "",
      };
    } else if (nextRole === "parent" && data.parent) {
      nextUser = {
        id: data.parent.id || identifier,
        email: data.parent.email || `${identifier}@parent.com`,
        role: "parent",
        full_name: data.parent.name || identifier,
        created_at: new Date().toISOString(),
        phone: data.parent.phone || "",
        linkedStudentId: data.student?.id || data.parent.linkedStudentId,
      };
    } else {
      // Decode JWT for ID if not provided explicitly in payload (since admin routes return just token)
      let decodedId = identifier;
      try {
        const decoded = jwtDecode<{ id: string }>(data.token);
        if (decoded.id) decodedId = decoded.id;
      } catch (e) {
        // ignore
      }
      
      nextUser = {
        id: decodedId,
        email: `${identifier}@${nextRole}.com`,
        role: nextRole,
        full_name: `${nextRole.charAt(0).toUpperCase() + nextRole.slice(1)} User (${identifier})`,
        created_at: new Date().toISOString(),
      };
    }

    const nextSession = { access_token: data.token, user: nextUser };
    setUser(nextUser);
    setRole(nextRole);
    setSession(nextSession);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, savedAt: Date.now() }));
  };

  const signOut = async () => {
    window.localStorage.removeItem(STORAGE_KEY);
    removeAuthToken();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
