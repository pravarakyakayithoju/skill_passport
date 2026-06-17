'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Code2, Layers, Video, FileText } from 'lucide-react';

interface ScoreBreakdownProps {
  codeScore: number;
  mcqScore: number;
  explanationScore: number;
  resumeScore: number;
}

export default function ScoreBreakdown({
  codeScore,
  mcqScore,
  explanationScore,
  resumeScore,
}: ScoreBreakdownProps) {
  const metrics = [
    {
      label: 'Coding & Execution',
      score: codeScore,
      weight: '45%',
      icon: Code2,
      color: 'bg-teal-500',
      textColor: 'text-teal-400',
    },
    {
      label: 'Adaptive MCQ Check',
      score: mcqScore,
      weight: '25%',
      icon: Layers,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-400',
    },
    {
      label: 'Audio Code Coherence',
      score: explanationScore,
      weight: '20%',
      icon: Video,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-400',
    },
    {
      label: 'Resume Skill Mapping',
      score: resumeScore,
      weight: '10%',
      icon: FileText,
      color: 'bg-slate-450',
      textColor: 'text-slate-400',
    },
  ];

  return (
    <div className="space-y-5">
      <h3 className="text-xs uppercase tracking-widest font-mono text-slate-500 font-bold mb-1">
        Metrics Breakdown
      </h3>
      <div className="space-y-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="space-y-2 p-3.5 bg-slate-950/40 border border-slate-900 rounded-xl hover:border-slate-850 transition-all duration-300">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-md bg-slate-900 border border-slate-800 ${m.textColor}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-slate-300">{m.label}</span>
                </div>
                <div className="flex items-center space-x-2 font-mono">
                  <span className="text-slate-500 text-[10px]">Weight: {m.weight}</span>
                  <span className={`font-bold ${m.textColor}`}>{m.score.toFixed(1)}%</span>
                </div>
              </div>
              <Progress value={m.score} className="h-1.5 bg-slate-900" indicatorClassName={m.color} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
