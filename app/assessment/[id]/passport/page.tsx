'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SkillPassportCard from '@/components/passport/SkillPassportCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Award, ArrowLeft, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';

interface PassportPageProps {
  params: { id: string };
}

export default function PassportPage({ params }: PassportPageProps) {
  const router = useRouter();
  const assessmentId = params.id;

  const [passportData, setPassportData] = useState<any>(null);
  const [assessmentInfo, setAssessmentInfo] = useState<any>(null);
  const [resumeUrl, setResumeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPassport = async () => {
      try {
        const res = await fetch(`/api/passport/${assessmentId}`);
        if (!res.ok) {
          throw new Error('Failed to retrieve SkillForge scorecard details');
        }

        const data = await res.json();
        setPassportData(data.passport);
        setAssessmentInfo(data.assessment);
        setResumeUrl(data.resumeUrl || '');
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Error loading SkillForge scorecard.');
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPassport();
  }, [assessmentId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center justify-center space-y-6">
        <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
        <p className="text-slate-450 italic text-sm">Decoding verified credentials...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center relative overflow-hidden p-6 md:p-8">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Header */}
      <header className="w-full max-w-4xl px-4 py-4 flex items-center justify-between z-10 border-b border-slate-900 mb-8">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
            <Award className="h-5 w-5 text-slate-950" />
          </div>
          <span className="text-base font-bold tracking-tight bg-gradient-to-r from-teal-200 to-slate-100 bg-clip-text text-transparent">
            SkillForge
          </span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/')}
          className="border-slate-800 text-xs font-semibold text-slate-350 hover:bg-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Take New Assessment
        </Button>
      </header>

      {/* Main Passport Card Container */}
      <div className="flex-1 flex flex-col justify-center items-center w-full z-10 max-w-4xl pb-12 space-y-4">
        <div className="text-center space-y-2 mb-2">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Verified Candidate SkillForge Scorecard</h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            This scorecard is fully audited, backed by automated Judge0 compile logs, voice explanation checks, and telemetry logs.
          </p>
        </div>

        {passportData && (
          <SkillPassportCard
            passport={passportData}
            assessment={assessmentInfo}
            resumeUrl={resumeUrl}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="w-full text-center text-xs text-slate-600 z-10 max-w-4xl border-t border-slate-900 py-4">
        Secure SHA-256 Verified SkillForge Scorecard • Cryptographic ID: <span className="font-mono text-slate-500">{assessmentId}</span>
      </footer>
    </main>
  );
}
