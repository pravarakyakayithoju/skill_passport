'use client';

import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, ChevronRight, Check, X, AlertTriangle } from 'lucide-react';

interface TestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  error?: string;
}

interface CodeEditorProps {
  title: string;
  description: string;
  language: string;
  starterCode: string;
  visibleTests: Array<{ input: string; expected: string }>;
  onSubmit: (code: string) => void;
  isSubmitting: boolean;
}

export default function CodeEditor({
  title,
  description,
  language,
  starterCode,
  visibleTests,
  onSubmit,
  isSubmitting,
}: CodeEditorProps) {
  const [code, setCode] = useState(starterCode);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [isSandboxDisabled, setIsSandboxDisabled] = useState(false);

  const handleRunCode = async () => {
    setIsRunning(true);
    setRunError(null);
    setTestResults(null);
    setIsSandboxDisabled(false);

    try {
      const res = await fetch('/api/assessment/run-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          starterCode,
          visibleTests,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to run tests');
      }

      const data = await res.json();
      setTestResults(data.results || []);
      setIsSandboxDisabled(!!data.isSandboxDisabled);
    } catch (err: any) {
      console.error(err);
      setRunError(err.message || 'An error occurred while compiling code.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)] min-h-[500px]">
      
      {/* Left Column: Instructions (lg:col-span-5) */}
      <div className="lg:col-span-5 flex flex-col h-full overflow-hidden bg-slate-900/40 border border-slate-800 rounded-xl backdrop-blur-md">
        <div className="p-5 border-b border-slate-800 bg-slate-900/60">
          <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-2 font-mono uppercase text-[10px]">
            Problem Statement
          </Badge>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">{title}</h2>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed space-y-4">
          <div 
            dangerouslySetInnerHTML={{ 
              __html: description
                .replace(/`([^`]+)`/g, '<code class="bg-slate-950 px-1 py-0.5 rounded text-teal-400 font-mono">$1</code>')
                .replace(/\n\n/g, '<br/><br/>')
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100">$1</strong>')
            }} 
          />
        </div>
      </div>

      {/* Right Column: Code Editor & Console (lg:col-span-7) */}
      <div className="lg:col-span-7 flex flex-col h-full space-y-4 overflow-hidden">
        
        {/* Editor Container */}
        <div className="flex-1 min-h-[300px] border border-slate-800 rounded-xl overflow-hidden bg-[#1e1e1e] relative shadow-lg">
          <div className="absolute top-2 right-4 z-10 flex items-center space-x-2 bg-slate-950/80 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-400 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="capitalize">{language}</span>
          </div>

          <Editor
            height="100%"
            language={language === 'javascript' ? 'javascript' : 'python'}
            theme="vs-dark"
            value={code}
            onChange={(val) => setCode(val || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: 'Fira Code, JetBrains Mono, source-code-pro, Menlo, Monaco, Consolas, monospace',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              padding: { top: 16 },
            }}
          />
        </div>

        {/* Console / Control Actions */}
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-md overflow-hidden">
          <CardHeader className="py-3 px-5 border-b border-slate-800 bg-slate-900/60 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-mono tracking-wider uppercase text-slate-400 flex items-center space-x-1.5">
              <span>Console Output</span>
            </CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting}
                className="bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-300 font-semibold"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-teal-400" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2 text-teal-400" />
                    Run Tests
                  </>
                )}
              </Button>
              <Button
                onClick={() => onSubmit(code)}
                disabled={isRunning || isSubmitting}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Submit & Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5 h-44 overflow-y-auto bg-slate-950/80 font-mono text-xs">
            {isSandboxDisabled && !isRunning && (
              <div className="mb-3.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-start space-x-2 font-sans">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                <div>
                  <div className="font-semibold text-amber-300">Sandbox Execution Disabled</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                    No <code className="bg-slate-950 px-1 py-0.2 rounded text-amber-400">JUDGE0_API_KEY</code> found in <code className="bg-slate-950 px-1 py-0.2 rounded text-amber-400 font-mono">.env.local</code>. Real-time compilation checks are bypassed (simulating acceptance).
                  </div>
                </div>
              </div>
            )}

            {isRunning && (
              <div className="flex items-center space-x-2 text-slate-400 italic">
                <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                <span>Compiling and verifying execution with Judge0...</span>
              </div>
            )}

            {runError && (
              <div className="flex items-start space-x-2 text-red-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <pre className="whitespace-pre-wrap font-sans">{runError}</pre>
              </div>
            )}

            {!isRunning && !runError && !testResults && (
              <span className="text-slate-500 italic">Click "Run Tests" to evaluate your solution.</span>
            )}

            {testResults && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-300">Test Execution Summary:</span>
                  <Badge className={testResults.every(t => t.passed) ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}>
                    {testResults.filter(t => t.passed).length} / {testResults.length} Passed
                  </Badge>
                </div>
                <div className="space-y-3.5">
                  {testResults.map((result, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/40 border border-slate-900 rounded-lg flex flex-col space-y-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-400 font-bold">Example Case {idx + 1}:</span>
                        {result.passed ? (
                          <span className="text-emerald-400 flex items-center font-bold">
                            <Check className="h-3.5 w-3.5 mr-1" /> Passed
                          </span>
                        ) : (
                          <span className="text-red-400 flex items-center font-bold">
                            <X className="h-3.5 w-3.5 mr-1" /> Failed
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-400">
                        <div>
                          <span className="text-[10px] uppercase text-slate-500 font-bold block">Input:</span>
                          <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded text-[11px] block mt-0.5">{result.input}</code>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-500 font-bold block">Expected:</span>
                          <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded text-[11px] block mt-0.5">{result.expected}</code>
                        </div>
                      </div>
                      {result.error ? (
                        <div className="mt-1">
                          <span className="text-[10px] uppercase text-red-500 font-bold block">Error:</span>
                          <pre className="text-red-400 whitespace-pre-wrap font-sans text-[11px] mt-0.5">{result.error}</pre>
                        </div>
                      ) : !result.passed ? (
                        <div className="mt-1">
                          <span className="text-[10px] uppercase text-amber-400 font-bold block">Actual Output:</span>
                          <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded text-[11px] block mt-0.5">{result.actual || 'undefined'}</code>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
