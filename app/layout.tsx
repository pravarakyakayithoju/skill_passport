import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  title: "Skill Passport — AI-Powered Assessment Platform",
  description: "Upload your resume, take a dynamically tailored assessment with live coding, adaptive MCQs, and explanation videos, and get a verified competency scorecard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          "min-h-screen bg-slate-950 font-sans antialiased selection:bg-teal-500/30 selection:text-teal-200",
          inter.variable,
          outfit.variable
        )}
      >
        {children}
        <Toaster theme="dark" closeButton position="bottom-right" richColors />
      </body>
    </html>
  );
}
