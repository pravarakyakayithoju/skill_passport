'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  skill: string;
  difficulty: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

interface AdaptiveMCQProps {
  assessmentId: string;
  onComplete: () => void;
}

export default function AdaptiveMCQ({ assessmentId, onComplete }: AdaptiveMCQProps) {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [sequenceNumber, setSequenceNumber] = useState(1); // 1 to 5
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState(2); // Start at 2
  const [lastWasCorrect, setLastWasCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30); // 30s per question
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch first question
  useEffect(() => {
    fetchNextQuestion([], 2, false);
  }, []);

  // Timer effect
  useEffect(() => {
    if (isLoading || isSubmitting || !currentQuestion) return;

    setTimeLeft(30);
    startTimeRef.current = Date.now();

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestion, isLoading, isSubmitting]);

  const fetchNextQuestion = async (
    historyIds: string[],
    currDiff: number,
    lastCorrect: boolean
  ) => {
    setIsLoading(true);
    setSelectedOption(null);

    try {
      const res = await fetch('/api/assessment/next-mcq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId,
          currentDifficulty: currDiff,
          lastWasCorrect: lastCorrect,
          answeredIds: historyIds,
        }),
      });

      if (!res.ok) throw new Error('Failed to fetch next question');

      const data = await res.json();

      if (data.isFinished || !data.question) {
        onComplete();
      } else {
        setCurrentQuestion(data.question);
        setDifficulty(data.question.difficulty);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load next question. Re-trying...');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeOut = () => {
    toast.warning("Time's up! Submitting blank answer...");
    handleSubmitAnswer('');
  };

  const handleSubmitAnswer = async (answerOverride?: string) => {
    const finalAnswer = answerOverride !== undefined ? answerOverride : selectedOption;
    if (isSubmitting || !currentQuestion) return;
    setIsSubmitting(true);

    if (timerRef.current) clearInterval(timerRef.current);

    const timeTakenMs = Date.now() - startTimeRef.current;

    try {
      const res = await fetch('/api/assessment/submit-mcq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId,
          questionId: currentQuestion.id,
          selectedAnswer: finalAnswer || 'NONE',
          timeTakenMs,
          sequenceNumber,
          difficultyLevel: difficulty,
        }),
      });

      if (!res.ok) throw new Error('Answer submission failed');

      const data = await res.json();
      
      const newAnsweredIds = [...answeredIds, currentQuestion.id];
      setAnsweredIds(newAnsweredIds);
      setLastWasCorrect(data.isCorrect);

      if (sequenceNumber >= 5) {
        // We have finished 5 questions
        onComplete();
      } else {
        setSequenceNumber((prev) => prev + 1);
        await fetchNextQuestion(newAnsweredIds, difficulty, data.isCorrect);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to register answer. Retrying...');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/30 border border-slate-900 rounded-2xl h-80">
        <Loader2 className="h-8 w-8 text-teal-400 animate-spin mb-4" />
        <p className="text-slate-400 italic">Selecting adaptive MCQ question...</p>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/30 border border-slate-900 rounded-2xl h-80">
        <AlertCircle className="h-8 w-8 text-amber-500 mb-4" />
        <p className="text-slate-400 italic">No questions available in MCQ pool.</p>
      </div>
    );
  }

  const progressPercentage = (timeLeft / 30) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Progress & Info Bar */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400 font-semibold font-mono">
          Question {sequenceNumber} of 5
        </span>
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-mono text-xs">Difficulty level:</span>
          <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono px-2 py-0.5">
            Lvl {difficulty}/5
          </Badge>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>TIME REMAINING</span>
          <span className={timeLeft <= 10 ? 'text-red-400 font-bold' : ''}>{timeLeft}s</span>
        </div>
        <Progress value={progressPercentage} className="h-1.5 bg-slate-900" indicatorClassName={timeLeft <= 10 ? 'bg-red-500' : 'bg-teal-500'} />
      </div>

      {/* Question Card */}
      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl relative overflow-hidden shadow-xl rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-transparent pointer-events-none" />
        <CardContent className="p-8 space-y-8">
          
          {/* Question Text */}
          <div className="flex items-start space-x-4">
            <div className="p-2.5 rounded-xl bg-slate-800/80 text-teal-400 border border-slate-700/50 flex-shrink-0">
              <HelpCircle className="h-5 w-5" />
            </div>
            <p className="text-lg font-semibold text-slate-100 leading-relaxed pt-1.5">
              {currentQuestion.question}
            </p>
          </div>

          {/* Options Radios */}
          <div className="grid grid-cols-1 gap-4">
            {Object.entries(currentQuestion.options).map(([key, value]) => {
              const isSelected = selectedOption === key;
              return (
                <div
                  key={key}
                  onClick={() => !isSubmitting && setSelectedOption(key)}
                  className={`flex items-center space-x-4 p-4 border rounded-xl cursor-pointer transition-all duration-350 ${
                    isSelected
                      ? 'border-teal-400 bg-teal-500/10 shadow-[0_0_15px_rgba(20,184,166,0.1)]'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60 text-slate-300'
                  }`}
                >
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'border-teal-400 text-teal-400 bg-teal-500/10' : 'border-slate-700 text-slate-500'
                  }`}>
                    {isSelected && <CheckCircle2 className="h-4.5 w-4.5 fill-teal-400 text-slate-950" />}
                  </div>
                  <div className="flex-1 text-sm leading-relaxed">
                    <span className="font-bold text-teal-400 mr-2">{key}.</span>
                    {value}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submission Button */}
          <div className="pt-2">
            <Button
              onClick={() => handleSubmitAnswer()}
              disabled={!selectedOption || isSubmitting}
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-5 text-sm shadow-md rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying Answer...
                </>
              ) : (
                <>
                  <span>Submit Answer</span>
                  <ArrowRight className="h-4.5 w-4.5" />
                </>
              )}
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
