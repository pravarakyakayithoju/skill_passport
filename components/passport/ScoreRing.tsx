'use client';

import React from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export default function ScoreRing({ score, size = 180, strokeWidth = 14 }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      {/* SVG Container */}
      <svg width={size} height={size} className="transform -rotate-90 drop-shadow-[0_0_12px_rgba(20,184,166,0.15)]">
        {/* Track Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-900 fill-none"
          strokeWidth={strokeWidth}
        />
        {/* Progress Ring with Gradient */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-teal-500 fill-none transition-all duration-1000 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="url(#tealGradient)"
        />
        
        {/* Define Gradient */}
        <defs>
          <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center Label */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-4xl md:text-5xl font-black tracking-tight text-slate-100 font-heading">
          {score.toFixed(1)}
        </span>
        <span className="text-[10px] tracking-widest font-mono text-teal-400 font-bold uppercase mt-1">
          FORGE SCORE
        </span>
      </div>
    </div>
  );
}
