'use client';

import React from 'react';
import ProcessingScreen from '@/components/assessment/ProcessingScreen';
import { Award } from 'lucide-react';

interface ProcessingPageProps {
  params: { id: string };
}

export default function ProcessingPage({ params }: ProcessingPageProps) {
  const assessmentId = params.id;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center relative overflow-hidden p-6">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Small Header */}
      <header className="w-full max-w-4xl px-4 py-4 flex items-center justify-between z-10 border-b border-slate-900">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
            <Award className="h-5 w-5 text-slate-950" />
          </div>
          <span className="text-base font-bold tracking-tight bg-gradient-to-r from-teal-200 to-slate-100 bg-clip-text text-transparent">
            SkillForge
          </span>
        </div>
      </header>

      {/* Main Core Screen */}
      <div className="flex-1 flex items-center justify-center w-full z-10">
        <ProcessingScreen assessmentId={assessmentId} />
      </div>

      {/* Empty space/footer */}
      <footer className="w-full text-center text-xs text-slate-600 z-10 max-w-4xl border-t border-slate-900 py-4">
        Evaluation calculations are processed in sandboxed environments.
      </footer>
    </main>
  );
}
