import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatClassOnly(grade?: string): string {
  if (!grade) return "Class 10";
  const trimmed = grade.trim();
  if (/^class\s*\d+/i.test(trimmed)) {
    return trimmed.replace(/^class\s*/i, "Class ");
  }
  const match = trimmed.match(/\d+/);
  if (match) {
    return `Class ${match[0]}`;
  }
  return trimmed;
}
