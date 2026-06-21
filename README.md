# 🎓 Skill Passport

An AI-powered skill assessment platform that turns a resume upload into a **verified skill scorecard**. Candidates upload a resume, take adaptive assessments (live coding, MCQs, explain-your-code), and receive a portable, verified score profile — no signup required.

> **Status:** 🚧 In active development.

---

## 💡 What It Does

Traditional resumes are unverified claims. Skill Passport verifies them:

1. **Upload a resume** (PDF) — the system parses it to identify claimed skills
2. **Take targeted assessments** — live coding (in-browser editor), adaptive MCQs, and explain-your-code recordings
3. **Get a verified scorecard** — a portable score profile backed by actual demonstrated ability, not self-reported claims

The result is a trust layer for hiring: a candidate's score means something because it was earned, not written.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router), React 18, TypeScript |
| **Backend** | Supabase (PostgreSQL), Vercel Serverless Functions |
| **AI** | OpenAI API (assessment generation & scoring) |
| **Code Editor** | Monaco Editor (in-browser live coding, same engine as VS Code) |
| **Resume Parsing** | pdf-parse |
| **State Management** | Zustand |
| **UI** | shadcn/ui, Tailwind CSS, Lucide icons |
| **Deployment** | Vercel |

---

## 🏗️ Architecture

```
skill_passport/
├── app/                    # Next.js App Router pages & API routes
├── components/             # Reusable React components (shadcn/ui)
├── lib/                    # Core business logic & utilities
├── stores/                # Zustand state management
├── supabase/migrations/   # PostgreSQL schema migrations
├── types/                 # TypeScript type definitions
└── scratch_test_gen.mjs   # Assessment generation script
```

---

## ✨ Key Features

- **No-auth flow** — candidates start assessing immediately, reducing drop-off
- **Resume-to-assessment pipeline** — PDF parsing feeds skill-targeted question generation
- **In-browser live coding** — Monaco editor for real coding assessments
- **AI-powered scoring** — OpenAI evaluates code and explanations
- **Verified scorecard** — a portable, tamper-resistant skill profile
- **Type-safe throughout** — 97%+ TypeScript for reliability and maintainability

---

## 🔑 Engineering Highlights

- **Full-stack TypeScript** — end-to-end type safety from database types to UI components
- **Database migrations** — version-controlled PostgreSQL schema via Supabase migrations
- **Serverless architecture** — Vercel functions for scalable, on-demand backend compute
- **AI integration** — structured prompting of the OpenAI API for assessment generation and grading
- **Modern React patterns** — App Router, server components, Zustand for client state

---

## 🚀 Running Locally

```bash
npm install

# Set up environment variables (.env.local):
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# OPENAI_API_KEY=...

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🗺️ Roadmap

- [ ] Complete the assessment scoring engine
- [ ] Deploy live on Vercel
- [ ] Add explain-your-code video recording
- [ ] Anti-cheat via keystroke-timing analysis
- [ ] Shareable public scorecard links

---

*A full-stack AI assessment platform — Next.js, Supabase, TypeScript, OpenAI.*
