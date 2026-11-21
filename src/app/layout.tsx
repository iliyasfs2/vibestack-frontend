import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ErrorMonitor } from "@/shared/ui/error-monitor";

import "./globals.css";

export const metadata: Metadata = {
  title: "VibeStack",
  description: "VibeStack modular starter kit",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen antialiased">
        <ErrorMonitor />
        {children}
      </body>
    </html>
  );
}
