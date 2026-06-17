'use client';

import React from 'react';
import ScoreRing from './ScoreRing';
import ScoreBreakdown from './ScoreBreakdown';
import EvidenceViewer from './EvidenceViewer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, FileDown, CheckCircle, Info, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SkillPassportCardProps {
  passport: any;
  assessment: any;
  resumeUrl: string;
}

export default function SkillPassportCard({
  passport,
  assessment,
  resumeUrl,
}: SkillPassportCardProps) {
  const finalScore = passport.final_score || 0;
  const finalConfidence = passport.final_confidence || 0;
  const confidencePenalty = passport.confidence_penalty || 0;
  const verifiedSkills = passport.verified_skills || [];
  const anomalyFlags = passport.anomaly_flags || [];

  // Determine confidence color schemes
  let confidenceColor = 'border-red-500/30 text-red-400 bg-red-500/5';
  let confidenceLabel = 'Low Reliability';

  if (finalConfidence >= 80) {
    confidenceColor = 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5';
    confidenceLabel = 'High Reliability';
  } else if (finalConfidence >= 60) {
    confidenceColor = 'border-amber-500/30 text-amber-400 bg-amber-500/5';
    confidenceLabel = 'Moderate Reliability';
  }

  const handleDownloadReport = () => {
    // Basic mock action for downloading passport details
    window.print();
    toast.success('Opening print dialog for Skill Passport report...');
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Outer Card with border glow */}
      <Card className="w-full bg-slate-900/60 border-slate-800 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl relative">
        {/* Glow behind card header */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-[1px] bg-gradient-to-r from-transparent via-teal-500/30 to-transparent pointer-events-none" />
        
        <CardContent className="p-6 md:p-8 space-y-8">
          
          {/* Header Panel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900 pb-6 gap-4">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center space-x-2.5">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
                  {assessment?.candidate_name || 'Anonymous Candidate'}
                </h2>
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 flex items-center space-x-1 font-mono text-[10px]">
                  <ShieldCheck className="h-3 w-3" />
                  <span>VERIFIED</span>
                </Badge>
              </div>
              <p className="text-slate-400 text-sm font-semibold capitalize tracking-wide">
                Domain Specialization: <span className="text-teal-400 font-bold">{assessment?.primary_skill || 'javascript'}</span>
              </p>
            </div>
            
            {/* Header Actions */}
            <div className="flex space-x-2.5">
              {resumeUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(resumeUrl, '_blank')}
                  className="bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-300 font-semibold"
                >
                  View Original Resume
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadReport}
                className="bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-300 font-semibold flex items-center"
              >
                <FileDown className="h-4 w-4 mr-1.5 text-teal-400" />
                <span>Export Passport</span>
              </Button>
            </div>
          </div>

          {/* Metrics Dashboard Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            
            {/* Left Col: Overall Gauge (md:col-span-5) */}
            <div className="md:col-span-5 flex flex-col items-center justify-center space-y-5 border-b md:border-b-0 md:border-r border-slate-900 pb-6 md:pb-0 md:pr-8">
              <ScoreRing score={finalScore} />
              
              {/* Confidence metrics */}
              <div className="text-center space-y-1.5 w-full max-w-xs">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Assessment Confidence:</span>
                  <Badge variant="outline" className={`${confidenceColor} font-bold`}>
                    {finalConfidence.toFixed(0)}%
                  </Badge>
                </div>
                
                {/* Penalty warnings if any */}
                {confidencePenalty > 0 ? (
                  <div className="text-[10px] text-red-400 flex items-center justify-center space-x-1 font-mono pt-1">
                    <Info className="h-3 w-3 flex-shrink-0" />
                    <span>-{confidencePenalty.toFixed(0)}% integrity deduction flags applied</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-emerald-400 flex items-center justify-center space-x-1 font-mono pt-1">
                    <CheckCircle className="h-3 w-3 flex-shrink-0" />
                    <span>100% integrity score validation passed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Progress Splits (md:col-span-7) */}
            <div className="md:col-span-7 text-left">
              <ScoreBreakdown
                codeScore={passport.code_score || 0}
                mcqScore={passport.mcq_score || 0}
                explanationScore={passport.explanation_score || 0}
                resumeScore={passport.resume_score || 0}
              />
            </div>

          </div>

          {/* Skills Badges */}
          <div className="space-y-2.5 text-left border-t border-slate-900 pt-6">
            <h3 className="text-xs uppercase tracking-widest font-mono text-slate-500 font-bold">
              Verified Passport Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {verifiedSkills.map((skill: string, index: number) => (
                <Badge
                  key={index}
                  className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 px-3 py-1 font-semibold capitalize font-mono text-xs shadow-sm shadow-teal-950/20"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Tabs Evidence Section */}
      <div className="pt-2 z-10 relative">
        <EvidenceViewer
          codeSnippet={passport.code_snippet}
          videoUrl={passport.video_url}
          codeAnalysis={passport.code_analysis}
          explanationAnalysis={passport.explanation_analysis}
          resumeAnalysis={passport.resume_analysis}
          pasteCount={passport.keystroke_timeline ? passport.keystroke_timeline.filter((e: any) => e.type === 'paste' || e.type === 'shortcut_paste').length : 0}
          tabSwitchCount={passport.keystroke_timeline ? passport.keystroke_timeline.filter((e: any) => e.type === 'tab_switch_hidden').length : 0}
          anomalyFlags={passport.anomaly_flags}
        />
      </div>

    </div>
  );
}
