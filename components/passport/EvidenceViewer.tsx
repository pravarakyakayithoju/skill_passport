'use client';

import React from 'react';
import Editor from '@monaco-editor/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, ShieldAlert, Cpu, CheckCircle, Code2, AlertTriangle, Video, BarChart2 } from 'lucide-react';

interface EvidenceViewerProps {
  codeSnippet: string;
  videoUrl: string;
  codeAnalysis: any;
  explanationAnalysis: any;
  resumeAnalysis: any;
  pasteCount: number;
  tabSwitchCount: number;
  anomalyFlags: string[];
}

export default function EvidenceViewer({
  codeSnippet,
  videoUrl,
  codeAnalysis,
  explanationAnalysis,
  resumeAnalysis,
  pasteCount,
  tabSwitchCount,
  anomalyFlags,
}: EvidenceViewerProps) {
  return (
    <div className="w-full">
      <h3 className="text-xs uppercase tracking-widest font-mono text-slate-500 font-bold mb-3">
        Review Evaluation Evidence
      </h3>
      
      {/* Dynamic Tabs list */}
      <Tabs defaultValue="code" className="w-full">
        <div className="flex border-b border-slate-900 pb-2 mb-6 overflow-x-auto">
          <TabsList className="bg-slate-950 border border-slate-900 p-1 rounded-xl flex space-x-1">
            <TabsTrigger value="code" className="px-4 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-teal-400">
              <Code2 className="h-3.5 w-3.5 mr-1.5 inline" /> Code Submitted
            </TabsTrigger>
            <TabsTrigger value="video" className="px-4 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-400">
              <Video className="h-3.5 w-3.5 mr-1.5 inline" /> Recording Pitch
            </TabsTrigger>
            <TabsTrigger value="analysis" className="px-4 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-400">
              <Cpu className="h-3.5 w-3.5 mr-1.5 inline" /> AI Evaluation
            </TabsTrigger>
            <TabsTrigger value="telemetry" className="px-4 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-amber-450">
              <BarChart2 className="h-3.5 w-3.5 mr-1.5 inline" /> Telemetry Log
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Code Snippet Content */}
        <TabsContent value="code" className="focus-visible:ring-0 mt-0">
          <div className="h-80 border border-slate-900 rounded-xl overflow-hidden bg-[#1e1e1e]">
            <Editor
              height="100%"
              language="javascript"
              theme="vs-dark"
              value={codeSnippet || '// No code submitted'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'Fira Code, JetBrains Mono, monospace',
                scrollBeyondLastLine: false,
                padding: { top: 12 },
              }}
            />
          </div>
        </TabsContent>

        {/* Video Recording Content */}
        <TabsContent value="video" className="focus-visible:ring-0 mt-0">
          {videoUrl ? (
            <div className="relative aspect-video max-w-2xl mx-auto rounded-xl overflow-hidden bg-slate-950 border border-slate-900 shadow-inner flex items-center justify-center">
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-950 rounded-xl border border-slate-900 text-slate-500 h-60">
              <PlayCircle className="h-10 w-10 mb-2" />
              <p className="text-sm">No explanation recording captured during session</p>
            </div>
          )}
        </TabsContent>

        {/* AI Analysis Reports Content */}
        <TabsContent value="analysis" className="focus-visible:ring-0 mt-0 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Code quality review */}
          <Card className="bg-slate-900/30 border-slate-900 shadow-md rounded-xl">
            <CardContent className="p-5 space-y-3">
              <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider font-mono flex items-center text-teal-400">
                <Code2 className="h-4 w-4 mr-1.5" /> Code Grade Analysis
              </h4>
              <div className="space-y-2 text-xs">
                <p><strong className="text-slate-400">Complexity:</strong> <span className="font-mono text-teal-300">{codeAnalysis?.complexity || 'O(N)'}</span></p>
                <p><strong className="text-slate-400">Readability:</strong> <span className="text-slate-300">{codeAnalysis?.readability || 'Standard readability.'}</span></p>
                {codeAnalysis?.issues && codeAnalysis.issues.length > 0 && (
                  <div>
                    <strong className="text-slate-400 block mb-1">Identified Issues:</strong>
                    <ul className="list-disc pl-4 space-y-1 text-red-400">
                      {codeAnalysis.issues.map((issue: string, idx: number) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Explanation Coherence review */}
          <Card className="bg-slate-900/30 border-slate-900 shadow-md rounded-xl">
            <CardContent className="p-5 space-y-3">
              <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider font-mono flex items-center text-indigo-400">
                <Video className="h-4 w-4 mr-1.5" /> Speech Coherence
              </h4>
              <div className="space-y-2 text-xs">
                <p>
                  <strong className="text-slate-400">Coherent logic:</strong>{' '}
                  <Badge variant="outline" className={explanationAnalysis?.coherent ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-red-500/30 text-red-400 bg-red-500/5'}>
                    {explanationAnalysis?.coherent ? 'Matches Code' : 'Contradicts Code'}
                  </Badge>
                </p>
                {explanationAnalysis?.contradictions && explanationAnalysis.contradictions.length > 0 && (
                  <div>
                    <strong className="text-slate-400 block mb-1">Contradictions:</strong>
                    <ul className="list-disc pl-4 space-y-1 text-amber-400">
                      {explanationAnalysis.contradictions.map((contra: string, idx: number) => (
                        <li key={idx}>{contra}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resume matching review */}
          <Card className="bg-slate-900/30 border-slate-900 shadow-md rounded-xl">
            <CardContent className="p-5 space-y-3">
              <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider font-mono flex items-center text-emerald-400">
                <Cpu className="h-4 w-4 mr-1.5" /> Skill Matching Fit
              </h4>
              <div className="space-y-2 text-xs">
                <p className="text-slate-300 leading-relaxed italic">"{resumeAnalysis?.summary || 'Skill profile mapping matched successfully.'}"</p>
                {resumeAnalysis?.missing_skills && resumeAnalysis.missing_skills.length > 0 && (
                  <div>
                    <strong className="text-slate-400 block mb-1">Missing Profile Gaps:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {resumeAnalysis.missing_skills.map((gap: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="border-red-500/30 text-red-400 bg-red-500/5 capitalize py-0">
                          {gap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Telemetry log content */}
        <TabsContent value="telemetry" className="focus-visible:ring-0 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-900/30 border-slate-900 shadow-md rounded-xl">
              <CardContent className="p-6 space-y-4">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider font-mono">
                  Telemetry Metrics
                </h4>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-xl">
                    <span className="text-3xl font-extrabold text-teal-400 font-mono block">
                      {pasteCount}
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                      Paste Actions
                    </span>
                  </div>
                  <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-xl">
                    <span className="text-3xl font-extrabold text-teal-400 font-mono block">
                      {tabSwitchCount}
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                      Focus Lost (Tab Shifts)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/30 border-slate-900 shadow-md rounded-xl">
              <CardContent className="p-6 space-y-4">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider font-mono">
                  Integrity Auditing Anomaly Flags
                </h4>
                <div className="flex flex-col gap-2">
                  {anomalyFlags.length === 0 ? (
                    <div className="flex items-center space-x-2 text-emerald-400 text-xs p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      <CheckCircle className="h-4.5 w-4.5" />
                      <span>Zero anomalies flagged during the session. (Passed Integrity Audit)</span>
                    </div>
                  ) : (
                    anomalyFlags.map((flag, idx) => {
                      let flagTitle = flag;
                      let flagDesc = 'Flagged during compilation checks.';
                      
                      if (flag === 'excessive_pasting') {
                        flagTitle = 'Excessive Copy Pasting';
                        flagDesc = 'Suspicious external code pasting detected.';
                      } else if (flag === 'excessive_tab_switches') {
                        flagTitle = 'Excessive Tab Shifts';
                        flagDesc = 'Frequently switched browser tabs/windows.';
                      } else if (flag === 'fast_completion') {
                        flagTitle = 'Rapid Submission';
                        flagDesc = 'Completed the entire assessment in under 3 minutes.';
                      } else if (flag === 'explanation_contradiction') {
                        flagTitle = 'Speech-to-Code Coherence Flag';
                        flagDesc = 'Voice description logic contradicts submitted code.';
                      }

                      return (
                        <div key={idx} className="flex items-start space-x-3 text-xs p-3 bg-red-500/5 border border-red-500/25 text-red-250 rounded-xl">
                          <AlertTriangle className="h-4.5 w-4.5 text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-bold block text-red-300 capitalize">{flagTitle}</span>
                            <span className="text-slate-500 block mt-0.5">{flagDesc}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
