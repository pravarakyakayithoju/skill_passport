'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAssessmentStore } from '@/stores/assessmentStore';
import ProctoringSetup from '@/components/assessment/ProctoringSetup';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, Loader2, AlertCircle, Play } from 'lucide-react';

export default function ResumeUpload() {
  const router = useRouter();
  const { setResumeData, setAssessmentId, setProctoringStream } = useAssessmentStore();

  const [name, setName] = useState('');
  const [showProctoringSetup, setShowProctoringSetup] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'parsed' | 'provisioning' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [primarySkill, setPrimarySkill] = useState('');
  const [tempId, setTempId] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        setFile(selectedFile);
        triggerUpload(selectedFile);
      } else {
        showError('Only PDF files are supported.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        setFile(selectedFile);
        triggerUpload(selectedFile);
      } else {
        showError('Only PDF files are supported.');
      }
    }
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setStatus('failed');
  };

  const triggerUpload = async (pdfFile: File) => {
    try {
      setStatus('uploading');
      setProgress(20);
      setErrorMessage('');

      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('candidate_name', name);

      setProgress(40);
      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to parse resume');
      }

      setProgress(80);
      const data = await res.json();

      setExtractedSkills(data.skills || []);
      setPrimarySkill(data.primary_skill || '');
      setTempId(data.tempId || '');
      setFileUrl(data.file_url || '');
      setParsedData(data.parsed_data || null);

      if (data.parsed_data?.full_name && !name) {
        setName(data.parsed_data.full_name);
      }

      // Save to store
      setResumeData({
        skills: data.skills || [],
        primary_skill: data.primary_skill || '',
        parsed_data: data.parsed_data || null,
        tempId: data.tempId || '',
        file_url: data.file_url || '',
      });

      setProgress(100);
      setStatus('parsed');
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Error occurred while analyzing resume.');
    }
  };

  const startAssessmentAfterProctoring = async (stream: MediaStream) => {
    setShowProctoringSetup(false);
    setProctoringStream(stream);

    if (!tempId) return;

    try {
      setStatus('provisioning');
      setErrorMessage('');
      setProgress(10);

      const res = await fetch('/api/assessment/begin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidate_name: name || parsedData?.full_name || 'Anonymous Candidate',
          primary_skill: primarySkill,
          extracted_skills: extractedSkills,
          tempId,
          file_url: fileUrl,
          parsed_data: parsedData,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to initialize assessment');
      }

      const { assessmentId } = await res.json();
      setAssessmentId(assessmentId);
      setProgress(30);

      // Start polling
      let isSettled = false;
      let pollCount = 0;
      const maxPolls = 60; // 2 minutes max

      const pollInterval = setInterval(async () => {
        pollCount++;
        if (pollCount > maxPolls) {
          clearInterval(pollInterval);
          showError('Assessment provisioning timed out. Please try again.');
          return;
        }

        try {
          const statusRes = await fetch(`/api/assessment/status/${assessmentId}?t=${Date.now()}`);
          if (!statusRes.ok) throw new Error('Status check failed');

          const statusData = await statusRes.json();
          setProgress(Math.min(95, 30 + pollCount * 5));

          if (statusData.status === 'in_progress') {
            clearInterval(pollInterval);
            isSettled = true;
            setProgress(100);
            router.push(`/assessment/${assessmentId}/coding`);
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            isSettled = true;
            showError(statusData.error_message || 'Assessment generation failed.');
          }
        } catch (pollErr) {
          console.error('Error polling status:', pollErr);
        }
      }, 2000);

    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Failed to begin assessment.');
    }
  };

  const handleBeginAssessment = async () => {
    if (!tempId) return;
    setShowProctoringSetup(true);
  };

  return (
    <Card className="w-full glass-card text-slate-100 overflow-hidden shadow-2xl relative border-slate-800/80">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
      <CardContent className="p-8">
        <div className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="candidate-name" className="text-slate-350 font-medium">Candidate Name (Optional)</Label>
            <Input
              id="candidate-name"
              placeholder="e.g. Alex Mercer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={status === 'uploading' || status === 'provisioning'}
              className="bg-slate-950/90 border-slate-800 text-slate-100 focus-visible:ring-teal-500 focus-visible:ring-offset-slate-950"
            />
          </div>

          {/* Upload Zone */}
          {status === 'idle' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
                isDragOver
                  ? 'border-teal-450 bg-teal-500/10 shadow-[0_0_30px_rgba(20,184,166,0.2)]'
                  : 'border-slate-800 bg-slate-950/60 hover:border-teal-500/35 hover:bg-slate-950/95 hover:shadow-[0_0_25px_rgba(20,184,166,0.08)]'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf"
                className="hidden"
              />
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 rounded-full bg-slate-800/80 text-teal-400 border border-slate-700/50">
                  <Upload className="h-8 w-8 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-lg text-slate-200">Drag and drop your resume here</p>
                  <p className="text-sm text-slate-400">or click to browse from device (PDF only)</p>
                </div>
              </div>
            </div>
          )}

          {/* Uploading Progress */}
          {status === 'uploading' && (
            <div className="border border-slate-800 rounded-xl p-8 bg-slate-950/30 flex flex-col space-y-4 items-center">
              <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
              <div className="w-full text-center space-y-2">
                <p className="font-medium text-slate-300">Analyzing Resume with AI...</p>
                <Progress value={progress} className="h-2 bg-slate-800" indicatorClassName="bg-teal-500" />
              </div>
            </div>
          )}

          {/* Failure Alert */}
          {status === 'failed' && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-200 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <AlertTitle className="font-semibold">Parsing Error</AlertTitle>
              <AlertDescription className="text-red-300 mt-1">{errorMessage}</AlertDescription>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatus('idle');
                  setFile(null);
                }}
                className="mt-4 border-red-500/40 hover:bg-red-500/20 text-red-200"
              >
                Try Again
              </Button>
            </Alert>
          )}

          {/* Uploaded & Extracted Skills */}
          {status === 'parsed' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                <CheckCircle className="h-6 w-6 text-teal-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-teal-300">Resume Parsed Successfully</p>
                  <p className="text-sm text-slate-400 truncate">{file?.name}</p>
                </div>
              </div>

              {parsedData?.summary && (
                <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">AI Profile Summary</p>
                  <p className="text-slate-300 text-sm italic">"{parsedData.summary}"</p>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Primary Domain Focus</span>
                  <div className="mt-1">
                    <Badge className="bg-teal-500 text-slate-950 hover:bg-teal-400 px-3 py-1 font-semibold capitalize text-sm">
                      {primarySkill}
                    </Badge>
                  </div>
                </div>

                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Extracted Skills</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {extractedSkills.map((skill, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50 capitalize px-2.5 py-0.5"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleBeginAssessment}
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold py-6 text-base shadow-lg shadow-teal-500/15 group relative overflow-hidden rounded-xl transition-all duration-300"
                >
                  <span className="flex items-center justify-center space-x-2">
                    <span>Begin Assessment</span>
                    <Play className="h-5 w-5 fill-slate-950 transition-transform group-hover:translate-x-1" />
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* Provisioning Loader */}
          {status === 'provisioning' && (
            <div className="border border-slate-800 rounded-xl p-10 bg-slate-950/50 flex flex-col space-y-6 items-center">
              <Loader2 className="h-12 w-12 text-teal-400 animate-spin" />
              <div className="w-full text-center space-y-3">
                <p className="font-semibold text-lg text-slate-200">Provisioning Your Assessment...</p>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  Generating custom programming questions and multiple choice assessments tailored to your skills profile.
                </p>
                <Progress value={progress} className="h-2 bg-slate-800 max-w-xs mx-auto" indicatorClassName="bg-teal-500" />
              </div>
            </div>
          )}
        </div>
      </CardContent>
      {showProctoringSetup && (
        <ProctoringSetup 
          onStart={startAssessmentAfterProctoring} 
          onClose={() => setShowProctoringSetup(false)} 
        />
      )}
    </Card>
  );
}
