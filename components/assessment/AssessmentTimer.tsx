'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';

interface AssessmentTimerProps {
  durationSeconds: number;
  onExpire: () => void;
  warnThresholdSeconds?: number;
}

export default function AssessmentTimer({
  durationSeconds,
  onExpire,
  warnThresholdSeconds = 60,
}: AssessmentTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const onExpireRef = useRef(onExpire);
  
  // Keep the latest callback reference
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    // Capture precise end time
    const endTime = Date.now() + durationSeconds * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.round((endTime - now) / 1000));

      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpireRef.current();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [durationSeconds]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isLow = secondsLeft <= warnThresholdSeconds;

  return (
    <div
      className={`flex items-center space-x-2.5 px-4 py-2 rounded-full border transition-all duration-300 font-mono shadow-md z-15 ${
        isLow
          ? 'bg-red-500/10 border-red-500/40 text-red-400 animate-pulse scale-105 shadow-red-500/5'
          : 'bg-slate-900/80 border-slate-800 text-slate-300 shadow-slate-950/20'
      }`}
    >
      {isLow ? (
        <AlertTriangle className="h-4.5 w-4.5 text-red-400 animate-bounce" />
      ) : (
        <Timer className="h-4.5 w-4.5 text-teal-400" />
      )}
      <span className="text-base font-bold tracking-wider">{timeString}</span>
    </div>
  );
}
