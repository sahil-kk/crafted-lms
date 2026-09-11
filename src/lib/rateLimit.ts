import { NextRequest } from "next/server";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipStore.entries()) {
    if (now > record.resetTime) {
      ipStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Check if request exceeds rate limit.
 * @param req NextRequest
 * @param maxRequests Maximum requests allowed in window (default 10)
 * @param windowMs Window in milliseconds (default 60 seconds)
 * @returns { success: boolean, remaining: number, resetInSeconds: number }
 */
export function checkRateLimit(
  req: NextRequest,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000
): { success: boolean; remaining: number; resetInSeconds: number } {
  const ip = getClientIp(req);
  const now = Date.now();

  const record = ipStore.get(ip);

  if (!record || now > record.resetTime) {
    ipStore.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      remaining: maxRequests - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetInSeconds: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  record.count += 1;
  return {
    success: true,
    remaining: maxRequests - record.count,
    resetInSeconds: Math.ceil((record.resetTime - now) / 1000),
  };
}
