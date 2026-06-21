'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAssessmentStore } from '@/stores/assessmentStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft, Home, FileWarning } from 'lucide-react';

interface TerminatedPageProps {
  params: { id: string };
}

export default function TerminatedPage({ params }: TerminatedPageProps) {
  const router = useRouter();
  const resetStore = useAssessmentStore((state) => state.reset);
  const setProctoringStream = useAssessmentStore((state) => state.setProctoringStream);
  const proctoringStream = useAssessmentStore((state) => state.proctoringStream);

  useEffect(() => {
    // Stop webcam and microphone streams if active
    if (proctoringStream) {
      proctoringStream.getTracks().forEach((track) => track.stop());
      setProctoringStream(null);
    }
  }, [proctoringStream, setProctoringStream]);

  const handleReturnHome = () => {
    resetStore();
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-lg bg-slate-900/60 border-red-500/20 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent pointer-events-none" />
        <CardContent className="p-8 text-center space-y-6">
          
          <div className="p-5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 w-fit mx-auto shadow-[0_0_30px_rgba(239,68,68,0.15)] animate-pulse">
            <ShieldAlert className="h-14 w-14" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-red-200">
              Assessment Terminated
            </h1>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              Security Violation Detected
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-3.5 text-left text-sm text-slate-400 leading-normal">
            <div className="flex items-start space-x-2 text-amber-400">
              <FileWarning className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span className="font-semibold text-amber-300">Why did this happen?</span>
            </div>
            <p>
              Your session was automatically halted because 3 security compliance violations were registered. During a proctored assessment, you are strictly required to:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
              <li>Maintain Fullscreen mode at all times.</li>
              <li>Avoid opening other browser tabs or windows.</li>
              <li>Remain focused inside the active test window.</li>
              <li>Ensure your camera is uncovered and you remain fully visible.</li>
              <li>Maintain a quiet environment without loud background noise.</li>
            </ul>
            <p className="text-xs text-slate-500 italic mt-2">
              Note: This incident, including the tab-switching count and telemetry logs, has been recorded against your assessment scorecard profile.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleReturnHome}
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-bold py-6 rounded-xl transition-all duration-300 shadow-lg shadow-red-500/10 flex items-center justify-center space-x-2"
            >
              <Home className="h-5 w-5" />
              <span>Return to Dashboard</span>
            </Button>
          </div>

        </CardContent>
      </Card>
    </main>
  );
}
