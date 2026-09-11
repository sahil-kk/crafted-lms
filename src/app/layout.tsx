import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Crafted — Learning Hub",
  description: "A modern tuition platform for students, teachers and admins. Live classes, exams, results and more — all in one place.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "Crafted — Learning Hub",
    description: "A modern tuition platform for students, teachers and admins. Live classes, exams, results and more — all in one place.",
    images: ["https://study.craftedlearn.com/og-image.png"],
  },
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
