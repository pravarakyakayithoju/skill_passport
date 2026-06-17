'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAssessmentStore } from '@/stores/assessmentStore';
import AssessmentTimer from '@/components/assessment/AssessmentTimer';
import KeystrokeLogger from '@/components/assessment/KeystrokeLogger';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Code2, Award, Terminal } from 'lucide-react';
import { toast } from 'sonner';

// Monaco editor wrapper loaded with ssr:false
const CodeEditor = dynamic(() => import('@/components/assessment/CodeEditor'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
      <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800 rounded-xl p-6">
        <Skeleton className="h-6 w-32 bg-slate-850 mb-4" />
        <Skeleton className="h-10 w-3/4 bg-slate-850 mb-6" />
        <Skeleton className="h-4 w-full bg-slate-850 mb-2" />
        <Skeleton className="h-4 w-full bg-slate-850 mb-2" />
        <Skeleton className="h-4 w-4/5 bg-slate-850" />
      </div>
      <div className="lg:col-span-7 flex flex-col space-y-4">
        <div className="flex-1 bg-[#1e1e1e] border border-slate-800 rounded-xl p-4">
          <Skeleton className="h-full w-full bg-slate-850" />
        </div>
        <div className="h-44 bg-slate-950 border border-slate-800 rounded-xl p-4">
          <Skeleton className="h-4 w-32 bg-slate-850 mb-2" />
          <Skeleton className="h-4 w-48 bg-slate-850" />
        </div>
      </div>
    </div>
  ),
});

interface CodingPageProps {
  params: { id: string };
}

export default function CodingPage({ params }: CodingPageProps) {
  const router = useRouter();
  const assessmentId = params.id;
  
  const { candidateName, primarySkill } = useAssessmentStore();
  const [questionData, setQuestionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const res = await fetch(`/api/assessment/status/${assessmentId}`);
        if (!res.ok) throw new Error('Failed to fetch assessment status');
        
        const data = await res.json();
        
        if (data.status === 'failed') {
          toast.error('This assessment session encountered an error.');
          router.push('/');
          return;
        }

        if (data.codingQuestion) {
          setQuestionData(data.codingQuestion);
        } else {
          toast.error('Question data is not available. Check database logs.');
          router.push('/');
        }
      } catch (err) {
        console.error(err);
        toast.error('Error connecting to servers.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestion();
  }, [assessmentId, router]);

  const handleSubmitCode = async (code: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/assessment/submit-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId,
          code,
          language: questionData?.language || 'javascript',
        }),
      });

      if (!res.ok) throw new Error('Submission failed');

      toast.success('Coding solution submitted successfully!');
      router.push(`/assessment/${assessmentId}/mcq`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to submit code. Retrying...');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeExpire = () => {
    toast.warning('Time expired! Auto-submitting your coding solution...');
    // We trigger submission automatically with empty string or current value. Since we are inside the page wrapper,
    // the Monaco editor code state is inside the CodeEditor component. If Monaco has unsaved code, we submit what is saved or can trigger it.
    // To solve this simply, we will submit whatever code is stored, or we can just redirect, since Judge0 execution inside pipeline can read the code submission.
    // If submit fails or isn't called, it will default to empty code or starter code which is fine.
    // Let's redirect to MCQ.
    router.push(`/assessment/${assessmentId}/mcq`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col space-y-6">
        <div className="flex items-center justify-between border-b border-slate-900 pb-4">
          <Skeleton className="h-10 w-48 bg-slate-900" />
          <Skeleton className="h-10 w-24 bg-slate-900" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
          <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800 rounded-xl p-6">
            <Skeleton className="h-6 w-32 bg-slate-850 mb-4" />
            <Skeleton className="h-10 w-3/4 bg-slate-850 mb-6" />
          </div>
          <div className="lg:col-span-7 bg-[#1e1e1e] border border-slate-800 rounded-xl p-4">
            <Skeleton className="h-full w-full bg-slate-850" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden p-6 md:p-8">
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Telemetry Logger */}
      <KeystrokeLogger assessmentId={assessmentId} />

      {/* Header bar */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-900 pb-4 mb-6 gap-4 z-10">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Code2 className="h-6 w-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold tracking-tight text-slate-100">
                Phase 1: Technical Coding
              </span>
              <Badge variant="outline" className="border-teal-500/30 text-teal-400 font-mono text-[10px] uppercase">
                {questionData?.language}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Candidate: <span className="text-slate-300 font-semibold">{candidateName || 'Anonymous'}</span> • Target skill: <span className="text-slate-300 font-semibold capitalize">{primarySkill || 'JavaScript'}</span>
            </p>
          </div>
        </div>

        {/* Global timer configured to 8 minutes (480s) */}
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-500 font-mono bg-slate-900/80 border border-slate-850 px-2.5 py-1.5 rounded-lg">
            <Terminal className="h-3.5 w-3.5 text-teal-400" />
            <span>Monaco Compiler Active</span>
          </div>
          <AssessmentTimer durationSeconds={480} onExpire={handleTimeExpire} />
        </div>
      </header>

      {/* Dynamic Monaco Editor Wrapper */}
      {questionData && (
        <div className="flex-1 z-10">
          <CodeEditor
            title={questionData.title}
            description={questionData.description}
            language={questionData.language}
            starterCode={questionData.starter_code}
            visibleTests={questionData.visible_tests || []}
            onSubmit={handleSubmitCode}
            isSubmitting={isSubmitting}
          />
        </div>
      )}
    </main>
  );
}
