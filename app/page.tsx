import ResumeUpload from '@/components/ResumeUpload';
import { Card, CardContent } from '@/components/ui/card';
import { Code2, Layers, Video, Award, ShieldAlert, Cpu } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Header / Navigation */}
      <header className="w-full max-w-7xl px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Award className="h-6 w-6 text-slate-950" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-200 to-slate-100 bg-clip-text text-transparent">
            SkillPassport
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-slate-900 border border-slate-800 rounded-full px-3 py-1 text-slate-400">
          <Cpu className="h-4 w-4 text-teal-400" />
          <span>Powered by GPT-4o & Judge0</span>
        </div>
      </header>

      {/* Body Content */}
      <div className="w-full max-w-7xl px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-1 z-10">
        
        {/* Left Side: Pitch and Explanation */}
        <div className="lg:col-span-6 space-y-8 text-left">
          <div className="space-y-4">
            <div className="inline-block px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold tracking-wide uppercase">
              No Registration • Dynamic Generation
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Get Your Verified
              <span className="block mt-2 bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-400 bg-clip-text text-transparent">
                Skill Passport
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-normal leading-relaxed max-w-xl">
              Instantiate a personalized technical assessment generated on-the-fly from your resume. Code in real-time, solve adaptive MCQs, record an explanation, and obtain a tamper-proof competency score card.
            </p>
          </div>

          {/* Environment Credentials Notice */}
          {(() => {
            const hasGroq = !!process.env.GROQ_API_KEY || (!!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('gsk_'));
            const hasOpenAI = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('gsk_');
            const hasLLM = hasGroq || hasOpenAI;
            const hasJudge0 = !!process.env.JUDGE0_API_KEY;

            if (hasLLM && hasJudge0) return null;

            return (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-2 max-w-xl backdrop-blur-md shadow-lg shadow-amber-950/20">
                <div className="flex items-center space-x-2 font-bold text-amber-400">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Missing API Keys (Demo Mode Active)</span>
                </div>
                <p className="text-slate-400 leading-normal">
                  To test real-time code execution and dynamic AI generation, configure your keys in <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-400 font-mono">.env.local</code>:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-300">
                  {!hasLLM && (
                    <li>
                      <strong className="text-amber-400">LLM (Groq / OpenAI):</strong> Paste a Groq key (starts with <code className="font-mono text-slate-400">gsk_</code>) into <code className="font-mono text-slate-400">GROQ_API_KEY=</code>. Otherwise, resume parsing and questions will be hardcoded.
                    </li>
                  )}
                  {!hasJudge0 && (
                    <li>
                      <strong className="text-amber-400">Judge0 (RapidAPI):</strong> Paste your RapidAPI key into <code className="font-mono text-slate-400">JUDGE0_API_KEY=</code> to run coding sandbox. Otherwise, the live editor cannot execute/check code.
                    </li>
                  )}
                </ul>
              </div>
            );
          })()}

          {/* Assessment timeline cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80 transition-all duration-300">
              <CardContent className="p-5 space-y-3">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 w-fit border border-teal-500/20">
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200">1. Coding</h3>
                  <p className="text-xs text-slate-400 mt-1">8 Min • Monaco Editor</p>
                  <p className="text-xs text-slate-500 mt-1">Real-time compiler & keystroke verification.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80 transition-all duration-300">
              <CardContent className="p-5 space-y-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit border border-emerald-500/20">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200">2. Adaptive MCQ</h3>
                  <p className="text-xs text-slate-400 mt-1">4 Min • 5 Questions</p>
                  <p className="text-xs text-slate-500 mt-1">Difficulty scales up or down with performance.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80 transition-all duration-300">
              <CardContent className="p-5 space-y-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 w-fit border border-indigo-500/20">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200">3. Video Pitch</h3>
                  <p className="text-xs text-slate-400 mt-1">3 Min • Record Code</p>
                  <p className="text-xs text-slate-500 mt-1">Explain your algorithm. Transcribed & AI analyzed.</p>
                </div>
              </CardContent>
            </Card>
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
          © 2026 SkillPassport Platform. All rights reserved.
        </div>
        <div className="flex items-center space-x-1 text-slate-600">
          <ShieldAlert className="h-4 w-4" />
          <span>Anonymous assessment session. Sessions expire automatically.</span>
        </div>
      </footer>
    </main>
  );
}
