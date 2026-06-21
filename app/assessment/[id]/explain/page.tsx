'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAssessmentStore } from '@/stores/assessmentStore';
import VideoRecorder from '@/components/assessment/VideoRecorder';
import AssessmentTimer from '@/components/assessment/AssessmentTimer';
import KeystrokeLogger from '@/components/assessment/KeystrokeLogger';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Terminal, ArrowRight, Loader2, Play, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import ProctoringMonitor from '@/components/assessment/ProctoringMonitor';

interface ExplainPageProps {
  params: { id: string };
}

export default function ExplainPage({ params }: ExplainPageProps) {
  const router = useRouter();
  const assessmentId = params.id;
  const { candidateName, primarySkill } = useAssessmentStore();

  const [isVideoUploaded, setIsVideoUploaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeSubmission, setCodeSubmission] = useState<{ code: string; language: string } | null>(null);
  const [isLoadingCode, setIsLoadingCode] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/assessment/status/${assessmentId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.codeSubmission) {
            setCodeSubmission(data.codeSubmission);
          }
        }
      } catch (err) {
        console.error('Failed to fetch assessment status:', err);
      } finally {
        setIsLoadingCode(false);
      }
    };
    fetchStatus();
  }, [assessmentId]);

  const handleVideoUploaded = () => {
    setIsVideoUploaded(true);
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId }),
      });

      if (!res.ok) throw new Error('Failed to submit assessment to evaluation pipeline');

      toast.success('Assessment submitted successfully!');
      router.push(`/assessment/${assessmentId}/processing`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Submission error. Retrying...');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeExpire = () => {
    toast.warning('Time expired for audio phase!');
    // If they haven't uploaded, we transition anyway so they can see the passport
    router.push(`/assessment/${assessmentId}/processing`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden p-6 md:p-8">
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Telemetry Logger */}
      <KeystrokeLogger assessmentId={assessmentId} />
      <ProctoringMonitor assessmentId={assessmentId} />

      {/* Header bar */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-900 pb-4 mb-8 gap-4 z-10 w-full max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Mic className="h-6 w-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold tracking-tight text-slate-100">
                Phase 3: Explain Your Code
              </span>
              <Badge variant="outline" className="border-teal-500/30 text-teal-400 font-mono text-[10px] uppercase">
                Voice Pitch
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Candidate: <span className="text-slate-300 font-semibold">{candidateName || 'Anonymous'}</span> • Target skill: <span className="text-slate-300 font-semibold capitalize">{primarySkill || 'JavaScript'}</span>
            </p>
          </div>
        </div>

        {/* Global timer configured to 3 minutes (180s) */}
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-500 font-mono bg-slate-900/80 border border-slate-850 px-2.5 py-1.5 rounded-lg">
            <Terminal className="h-3.5 w-3.5 text-teal-400" />
            <span>Microphone Active</span>
          </div>
          <AssessmentTimer durationSeconds={180} onExpire={handleTimeExpire} />
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto w-full pb-12 items-stretch">
        
        {/* Left Column (Instructions & Recorder) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100">Explain Your Solution</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Record a short audio explanation (up to 90 seconds) explaining the code solution you wrote in Phase 1. 
              </p>
            </div>

            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-5 space-y-3.5 text-xs text-slate-400 font-sans">
                <p className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">GUIDELINES</p>
                <ul className="list-disc pl-4 space-y-2">
                  <li>Briefly describe the algorithm you implemented.</li>
                  <li>State the time and space complexity of your code.</li>
                  <li>Speak clearly into the microphone.</li>
                  <li>Your voice will be transcribed and cross-analyzed with your submitted code by the evaluation pipeline.</li>
                </ul>
              </CardContent>
            </Card>

            <VideoRecorder assessmentId={assessmentId} onUploadComplete={handleVideoUploaded} />
          </div>

          {/* Submit Action */}
          {isVideoUploaded && (
            <div className="pt-4 animate-bounce">
              <Button
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold py-6 text-base shadow-lg shadow-teal-500/15 rounded-xl transition-all duration-300"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Submitting Assessment...
                  </>
                ) : (
                  <>
                    <span>Submit Full Assessment</span>
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Right Column (Submitted Code Panel) */}
        <div className="lg:col-span-7 flex flex-col">
          <Card className="flex-1 bg-slate-900/40 border-slate-800 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[450px]">
            <CardContent className="p-6 flex flex-col h-full flex-1">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center space-x-2">
                  <Terminal className="h-4 w-4 text-teal-400" />
                  <span className="font-semibold text-sm text-slate-200">Your Submitted Code</span>
                </div>
                {codeSubmission?.language && (
                  <Badge variant="outline" className="border-teal-500/30 text-teal-400 font-mono text-[10px] uppercase">
                    {codeSubmission.language}
                  </Badge>
                )}
              </div>

              <div className="flex-1 min-h-[350px] relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                {isLoadingCode ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-400 space-x-2">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
                    <span className="text-sm">Retrieving submission...</span>
                  </div>
                ) : codeSubmission ? (
                  <Editor
                    height="100%"
                    language={codeSubmission.language || 'javascript'}
                    theme="vs-dark"
                    value={codeSubmission.code}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      scrollBeyondLastLine: false,
                      lineNumbers: 'on',
                      folding: true,
                      wordWrap: 'on',
                      contextmenu: false,
                      domReadOnly: true,
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2 text-slate-500">
                    <AlertCircle className="h-10 w-10 text-slate-600 animate-pulse" />
                    <p className="text-sm font-semibold">No Code Submission Found</p>
                    <p className="text-xs text-slate-400 max-w-xs leading-normal">
                      We couldn't retrieve your previous submission for this assessment phase.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </main>
  );
}
