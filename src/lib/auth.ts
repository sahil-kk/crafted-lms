import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export type AppRole = "admin" | "student" | "teacher" | "parent";

export interface TokenPayload {
  id: string;
  role: AppRole;
  studentId?: string;
}

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing.");
  }
  return secret;
};

export function getUserFromToken(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  if (!token) return null;

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Validates the JWT token in the Authorization header and checks role permissions.
 * Returns either { user } or { error: NextResponse }.
 */
export function requireAuth(
  req: NextRequest,
  allowedRoles?: AppRole[]
): { user: TokenPayload; error?: undefined } | { user?: undefined; error: NextResponse } {
  const user = getUserFromToken(req);

  if (!user) {
    return {
      error: NextResponse.json(
        { message: "Authentication required. Please log in." },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return {
      error: NextResponse.json(
        { message: "Access forbidden: insufficient permissions." },
        { status: 403 }
      ),
    };
  }

  return { user };
}

/**
 * Escapes regex metacharacters in user input to prevent regex injection / ReDoS attacks.
 */
export function escapeRegex(str: string): string {
  if (!str) return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Sanitizes user documents to ensure password hashes are never leaked in API responses.
 */
export function sanitizeUser(doc: any): any {
  if (!doc) return doc;
  const obj = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  delete obj.password;
  return obj;
}
