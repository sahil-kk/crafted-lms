import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Crafted Learning Hub - LMS Platform",
  description: "Comprehensive Learning Management System for students, teachers, parents, and admins.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full light antialiased" style={{ colorScheme: "light" }}>
      <body className="min-h-full flex flex-col font-sans bg-white text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
