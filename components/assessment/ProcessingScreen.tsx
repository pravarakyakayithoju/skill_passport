'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ShieldAlert, Cpu, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ProcessingScreenProps {
  assessmentId: string;
}

const STEPS = [
  { time: 0, text: 'Initializing evaluation pipeline containers...' },
  { time: 3, text: 'Executing submitted code against hidden Judge0 test cases...' },
  { time: 6, text: 'Evaluating algorithmic space/time complexity via GPT-4o...' },
  { time: 10, text: 'Transcribing explanation recording speech metrics...' },
  { time: 14, text: 'Analyzing speech-to-code logic coherence patterns...' },
  { time: 18, text: 'Cross-verifying resume skill trees against evaluation logs...' },
  { time: 22, text: 'Calculating aggregate final scores and confidence levels...' },
  { time: 26, text: 'Finalizing verified Skill Passport certificate...' }
];

export default function ProcessingScreen({ assessmentId }: ProcessingScreenProps) {
  const router = useRouter();
  const [currentStepText, setCurrentStepText] = useState(STEPS[0].text);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [status, setStatus] = useState<'processing' | 'failed'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // 1. Tick up elapsed time to cycle steps text
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        const nextTime = prev + 1;
        const matchingStep = [...STEPS].reverse().find(s => nextTime >= s.time);
        if (matchingStep) {
          setCurrentStepText(matchingStep.text);
        }
        return nextTime;
      });
    }, 1000);

    // 2. Poll status endpoint every 2 seconds
    const statusPoll = setInterval(async () => {
      try {
        const res = await fetch(`/api/assessment/status/${assessmentId}?t=${Date.now()}`);
        if (!res.ok) throw new Error('Status poll request failed');

        const data = await res.json();

        if (data.status === 'completed') {
          clearInterval(timer);
          clearInterval(statusPoll);
          toast.success('Skill Passport generated!');
          router.push(`/assessment/${assessmentId}/passport`);
        } else if (data.status === 'failed') {
          clearInterval(timer);
          clearInterval(statusPoll);
          setStatus('failed');
          setErrorMessage(data.error_message || 'The AI grading pipeline encountered an unexpected compile error.');
        }
      } catch (err: any) {
        console.error('Error polling pipeline status:', err);
      }
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(statusPoll);
    };
  }, [assessmentId, router]);

  // Compute artificial progress percentage (clamps at 98% until complete)
  const progressPercent = Math.min(98, Math.round((elapsedSeconds / 30) * 100));

  if (status === 'failed') {
    return (
      <Card className="w-full max-w-md mx-auto bg-slate-900 border-red-500/30 text-slate-100 rounded-2xl overflow-hidden shadow-2xl relative">
        <CardContent className="p-8 text-center space-y-6">
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full w-fit mx-auto">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-100">Evaluation Pipeline Error</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {errorMessage}
            </p>
          </div>
          <div className="pt-2">
            <Button
              onClick={() => router.push('/')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-4 rounded-xl transition-all"
            >
              Return to Landing Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-8 max-w-md mx-auto py-12">
      {/* Pulsing Ring Container */}
      <div className="relative h-48 w-48 flex items-center justify-center">
        {/* Pulsing background glow rings */}
        <div className="absolute inset-0 rounded-full border-2 border-teal-500/20 animate-ping" />
        <div className="absolute inset-4 rounded-full border border-teal-500/10 bg-teal-500/5 blur-sm" />
        
        {/* Core pulsing circle */}
        <div className="h-32 w-32 rounded-full border-4 border-dashed border-teal-500/60 bg-slate-950 flex flex-col items-center justify-center shadow-lg shadow-teal-500/15 animate-[spin_20s_linear_infinite] relative">
          <Cpu className="h-12 w-12 text-teal-400 animate-pulse transform rotate-[-360deg] duration-1000" />
        </div>
        
        {/* Spinner ring overlay */}
        <div className="absolute inset-6 border-2 border-y-transparent border-x-teal-400 rounded-full animate-spin" />
      </div>

      {/* Progress & Text */}
      <div className="w-full text-center space-y-4">
        <div className="space-y-1.5">
          <p className="text-lg font-bold tracking-tight text-slate-100 flex items-center justify-center">
            <span>Evaluating Assessment Logs</span>
            <Loader2 className="h-4 w-4 ml-2 animate-spin text-teal-400" />
          </p>
          <p className="text-sm text-slate-400 font-mono italic h-10 px-4 flex items-center justify-center">
            {currentStepText}
          </p>
        </div>

        <div className="space-y-1 max-w-xs mx-auto">
          <Progress value={progressPercent} className="h-1.5 bg-slate-900" indicatorClassName="bg-gradient-to-r from-teal-500 to-emerald-500" />
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
            <span>PIPELINE LOAD</span>
            <span>{progressPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
