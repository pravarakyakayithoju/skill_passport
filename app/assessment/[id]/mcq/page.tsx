'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAssessmentStore } from '@/stores/assessmentStore';
import AdaptiveMCQ from '@/components/assessment/AdaptiveMCQ';
import AssessmentTimer from '@/components/assessment/AssessmentTimer';
import KeystrokeLogger from '@/components/assessment/KeystrokeLogger';
import { Badge } from '@/components/ui/badge';
import { Layers, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import ProctoringMonitor from '@/components/assessment/ProctoringMonitor';

interface MCQPageProps {
  params: { id: string };
}

export default function MCQPage({ params }: MCQPageProps) {
  const router = useRouter();
  const assessmentId = params.id;
  const { candidateName, primarySkill } = useAssessmentStore();

  const handleMCQComplete = () => {
    toast.success('Adaptive MCQ phase complete!');
    router.push(`/assessment/${assessmentId}/explain`);
  };

  const handleTimeExpire = () => {
    toast.warning('Time expired for MCQ phase! Auto-advancing...');
    router.push(`/assessment/${assessmentId}/explain`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden p-6 md:p-8">
      {/* Background glow */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Telemetry Logger */}
      <KeystrokeLogger assessmentId={assessmentId} />
      <ProctoringMonitor assessmentId={assessmentId} />

      {/* Header bar */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-900 pb-4 mb-8 gap-4 z-10 w-full max-w-4xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Layers className="h-6 w-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold tracking-tight text-slate-100">
                Phase 2: Adaptive MCQ
              </span>
              <Badge variant="outline" className="border-teal-500/30 text-teal-400 font-mono text-[10px] uppercase">
                Adaptive
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Candidate: <span className="text-slate-300 font-semibold">{candidateName || 'Anonymous'}</span> • Target skill: <span className="text-slate-300 font-semibold capitalize">{primarySkill || 'JavaScript'}</span>
            </p>
          </div>
        </div>

        {/* Global timer configured to 4 minutes (240s) */}
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-500 font-mono bg-slate-900/80 border border-slate-850 px-2.5 py-1.5 rounded-lg">
            <Terminal className="h-3.5 w-3.5 text-teal-400" />
            <span>Telemetry Active</span>
          </div>
          <AssessmentTimer durationSeconds={240} onExpire={handleTimeExpire} />
        </div>
      </header>

      {/* MCQ Area */}
      <div className="flex-1 z-10 flex flex-col justify-center max-w-4xl mx-auto w-full pb-12">
        <AdaptiveMCQ assessmentId={assessmentId} onComplete={handleMCQComplete} />
      </div>
    </main>
  );
}
