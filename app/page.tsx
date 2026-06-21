import ResumeUpload from '@/components/ResumeUpload';
import { Card, CardContent } from '@/components/ui/card';
import { Code2, Layers, Video, Award, ShieldAlert, Cpu } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 bg-grid-pattern text-slate-100 flex flex-col items-center justify-between relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[700px] h-[700px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Header / Navigation */}
      <header className="w-full max-w-7xl px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Award className="h-6 w-6 text-slate-950" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-200 to-slate-100 bg-clip-text text-transparent">
            SkillForge
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-slate-900/80 border border-slate-800 rounded-full px-3 py-1 text-slate-400">
          <Cpu className="h-4 w-4 text-teal-400 animate-pulse" />
          <span>Powered by GPT-4o & Judge0</span>
        </div>
      </header>

      {/* Body Content */}
      <div className="w-full max-w-7xl px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start flex-1 z-10">
        
        {/* Left Side: Pitch and Scorecard Preview */}
        <div className="lg:col-span-6 space-y-8 text-left">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold tracking-wide uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-ping" />
              <span>AI Cognitive Assessment Active</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Forge Your Verified
              <span className="block mt-2 bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-400 bg-clip-text text-transparent">
                Competency Profile
              </span>
            </h1>
            <p className="text-slate-400 text-base md:text-lg font-normal leading-relaxed max-w-xl">
              Instantiate a personalized technical assessment generated on-the-fly from your resume. Code in real-time, solve adaptive MCQs, record an explanation, and obtain a tamper-proof competency scorecard.
            </p>
          </div>

          {/* Interactive Scorecard Mockup */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden group select-none max-w-xl transition-all duration-500 hover:border-teal-500/20">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-teal-500/15 transition-all duration-500" />
            
            <div className="flex items-start justify-between border-b border-slate-900 pb-4 mb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold">PREVIEW REPORT</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] uppercase font-mono tracking-wide text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">VALIDATED ON CHAIN</span>
                </div>
                <h4 className="text-base font-bold text-slate-200 mt-1">Alex Mercer • Software Engineer</h4>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-teal-400 font-heading">87.5<span className="text-[10px] text-slate-500">/100</span></span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Coding proficiency (Phase 1)</span>
                  <span className="text-teal-400 font-bold">92%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                  <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full animate-pulse" style={{ width: '92%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Adaptive MCQ Score (Phase 2)</span>
                  <span className="text-teal-400 font-bold">84%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                  <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full animate-pulse" style={{ width: '84%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Tech Pitch Coherence (Phase 3)</span>
                  <span className="text-teal-400 font-bold">88%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                  <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full animate-pulse" style={{ width: '88%' }} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-4 mt-4 border-t border-slate-900">
              <span className="text-[9px] font-mono bg-slate-900/60 text-slate-400 px-2 py-0.5 rounded border border-slate-800">react</span>
              <span className="text-[9px] font-mono bg-slate-900/60 text-slate-400 px-2 py-0.5 rounded border border-slate-800">typescript</span>
              <span className="text-[9px] font-mono bg-slate-900/60 text-slate-400 px-2 py-0.5 rounded border border-slate-800">nodejs</span>
              <span className="text-[9px] font-mono bg-slate-900/60 text-slate-400 px-2 py-0.5 rounded border border-slate-800">next.js</span>
              <span className="text-[9px] font-mono text-slate-600 ml-auto self-center">SHA-256: e3b0c442...</span>
            </div>
          </div>

          {/* Assessment timeline cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card glass-card-hover p-5 rounded-xl flex flex-col justify-between space-y-4">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 w-fit border border-teal-500/20">
                <Code2 className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">1. Coding Phase</h3>
                <p className="text-[11px] text-slate-450 mt-1">8 Min • Monaco Environment</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">Solve dynamically generated code tasks with real-time compilers.</p>
              </div>
            </div>

            <div className="glass-card glass-card-hover p-5 rounded-xl flex flex-col justify-between space-y-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit border border-emerald-500/20">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">2. Adaptive MCQ</h3>
                <p className="text-[11px] text-slate-450 mt-1">4 Min • Adaptive Scaling</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">Questions dynamically scale in difficulty based on response accuracy.</p>
              </div>
            </div>

            <div className="glass-card glass-card-hover p-5 rounded-xl flex flex-col justify-between space-y-4">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 w-fit border border-indigo-500/20">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">3. Logic Explain</h3>
                <p className="text-[11px] text-slate-450 mt-1">3 Min • Audio Pitch</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">Present complex structures. Speech is transcribed and cross-analyzed.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Resume Upload Component */}
        <div className="lg:col-span-6 w-full max-w-xl mx-auto lg:mx-0">
          <ResumeUpload />
        </div>

      </div>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 text-center text-xs text-slate-500 z-10 max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          © 2026 SkillForge Platform. All rights reserved.
        </div>
        <div className="flex items-center space-x-1 text-slate-650">
          <ShieldAlert className="h-4 w-4" />
          <span>Anonymous assessment session. Sessions expire automatically.</span>
        </div>
      </footer>
    </main>
  );
}
