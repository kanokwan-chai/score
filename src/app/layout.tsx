// src/app/layout.tsx
import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import { AppProvider } from "@/context/AppContext";
import "./globals.css";

const promptFont = Prompt({
  variable: "--font-prompt",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Student Learning Progress Tracker",
  description: "ระบบจัดการคะแนนและวิเคราะห์ความก้าวหน้าการเรียนรู้สำหรับอาจารย์และนักเรียน รองรับภาษาไทย 100%",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" data-theme="light">
      <body className={`${promptFont.variable}`}>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
