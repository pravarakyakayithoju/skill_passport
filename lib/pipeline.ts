import { supabaseAdmin } from './supabase/server';
import { MOCK, MOCK_AI, MOCK_CODE_ANALYSIS, MOCK_EXPLANATION_ANALYSIS, MOCK_RESUME_ANALYSIS, mockMemoryDb } from './mock';
import { runHiddenTests } from './judge0';
import { askGPTJson } from './openai';
import { calculatePassport } from './scoring';

interface CodeAnalysisResult {
  score: number;
  complexity: string;
  readability: string;
  issues: string[];
}

interface CoherenceResult {
  score: number;
  coherent: boolean;
  contradictions: string[];
}

interface ResumeAnalysisResult {
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  summary: string;
}

export async function runPipeline(assessmentId: string): Promise<void> {
  console.log(`Starting scoring pipeline for assessment: ${assessmentId}`);

  // Fetch assessment metadata
  let assessment: any = null;
  if (MOCK) {
    assessment = mockMemoryDb.assessments.get(assessmentId) || {
      primary_skill: 'javascript',
      extracted_skills: ['javascript', 'react', 'nodejs'],
      started_at: new Date(Date.now() - 300000).toISOString(),
      submitted_at: new Date().toISOString(),
      status: 'generating'
    };
  } else {
    const { data, error: assessmentError } = await supabaseAdmin
      .from('assessments')
      .select('started_at, submitted_at, primary_skill, extracted_skills')
      .eq('id', assessmentId)
      .single();

    if (assessmentError || !data) {
      throw new Error(`Failed to load assessment: ${assessmentError?.message || 'Not found'}`);
    }
    assessment = data;
  }

  // 1. Fetch code submission
  let submission: any = null;
  if (MOCK) {
    submission = mockMemoryDb.codeSubmissions.get(assessmentId);
  } else {
    const { data, error: submissionError } = await supabaseAdmin
      .from('code_submissions')
      .select('code, language')
      .eq('assessment_id', assessmentId)
      .maybeSingle();
    submission = data;
  }

  const code = submission?.code || '';
  const language = submission?.language || 'javascript';

  // 2. Fetch coding question to get hidden tests
  let question: any = null;
  if (MOCK) {
    question = mockMemoryDb.codingQuestions.get(assessmentId);
  } else {
    const { data, error: questionError } = await supabaseAdmin
      .from('coding_questions')
      .select('hidden_tests, starter_code')
      .eq('assessment_id', assessmentId)
      .maybeSingle();
    question = data;
  }

  const hiddenTestsRaw = question?.hidden_tests || [];
  let hiddenTests = [];
  let starterCode = question?.starter_code || '';

  if (typeof starterCode === 'string' && starterCode.startsWith('{')) {
    try {
      const parsedStarter = JSON.parse(starterCode);
      starterCode = parsedStarter[language] || '';
    } catch {}
  }
  
  if (Array.isArray(hiddenTestsRaw)) {
    hiddenTests = hiddenTestsRaw;
  } else if (hiddenTestsRaw && typeof hiddenTestsRaw === 'object') {
    hiddenTests = hiddenTestsRaw[language] || [];
  }

  // 3. Run Judge0 on hidden tests
  let passRate = 0;
  let testResultsData = null;

  if (code && hiddenTests.length > 0) {
    const judge0Results = await runHiddenTests(code, language, hiddenTests, starterCode);
    passRate = judge0Results.total > 0 ? judge0Results.passed / judge0Results.total : 0;
    testResultsData = judge0Results.results;

    // Update code_submissions with test results
    if (MOCK) {
      const sub = mockMemoryDb.codeSubmissions.get(assessmentId) || {};
      sub.test_results = testResultsData;
      sub.score = passRate * 100;
      mockMemoryDb.codeSubmissions.set(assessmentId, sub);
    } else {
      await supabaseAdmin
        .from('code_submissions')
        .update({
          test_results: testResultsData,
          score: passRate * 100,
        })
        .eq('assessment_id', assessmentId);
    }
  }

  // 4. Code quality analysis via GPT-4o
  let codeAnalysis: CodeAnalysisResult = {
    score: 0,
    complexity: 'N/A',
    readability: 'No code submitted',
    issues: ['No code submitted']
  };

  if (code) {
    if (!MOCK_AI) {
      const prompt = `Rate this ${language} programming code from 0 to 100.
Return JSON matching schema:
{
  "score": 95,
  "complexity": "O(N) Time, O(1) Space",
  "readability": "string description",
  "issues": ["string issue description"]
}
Code:
${code}`;
      codeAnalysis = await askGPTJson<CodeAnalysisResult>(prompt, MOCK_CODE_ANALYSIS);

      // Save to code_submissions
      if (MOCK) {
        const sub = mockMemoryDb.codeSubmissions.get(assessmentId) || {};
        sub.ai_code_analysis = codeAnalysis;
        mockMemoryDb.codeSubmissions.set(assessmentId, sub);
      } else {
        await supabaseAdmin
          .from('code_submissions')
          .update({ ai_code_analysis: codeAnalysis })
          .eq('assessment_id', assessmentId);
      }
    } else {
      codeAnalysis = MOCK_CODE_ANALYSIS;
    }
  }

  // 5. Video analysis & transcription
  let videoRecord: any = null;
  if (MOCK) {
    videoRecord = mockMemoryDb.explanationVideos.get(assessmentId) || null;
  } else {
    const { data, error: videoError } = await supabaseAdmin
      .from('explanation_videos')
      .select('video_url, transcript')
      .eq('assessment_id', assessmentId)
      .maybeSingle();
    videoRecord = data;
  }

  const transcript = videoRecord?.transcript || '';
  const videoUrl = videoRecord?.video_url || '';

  let explanationAnalysis: CoherenceResult = {
    score: 0,
    coherent: false,
    contradictions: ['No voice explanation video was submitted by the candidate.']
  };

  if (videoUrl && transcript) {
    if (!MOCK_AI && code) {
      const coherencePrompt = `Analyze if this spoken explanation matches and correctly explains the submitted programming code.
Are there contradictions in complexity statements or logic descriptions?
Return JSON matching schema:
{
  "score": 90,
  "coherent": true,
  "contradictions": ["string description of contradictions"]
}
Code:
${code}
Spoken Transcript:
${transcript}`;
      explanationAnalysis = await askGPTJson<CoherenceResult>(coherencePrompt, MOCK_EXPLANATION_ANALYSIS);

      // Save back to explanation_videos table
      if (MOCK) {
        const v = mockMemoryDb.explanationVideos.get(assessmentId) || {};
        v.ai_explanation_analysis = explanationAnalysis;
        v.score = explanationAnalysis.score;
        mockMemoryDb.explanationVideos.set(assessmentId, v);
      } else {
        await supabaseAdmin
          .from('explanation_videos')
          .update({
            ai_explanation_analysis: explanationAnalysis,
            score: explanationAnalysis.score,
          })
          .eq('assessment_id', assessmentId);
      }
    } else {
      // Mock evaluation with high score only if video actually exists
      explanationAnalysis = MOCK_EXPLANATION_ANALYSIS;
    }
  }

  // 6. Resume analysis
  let resumeRecord: any = null;
  if (MOCK) {
    resumeRecord = mockMemoryDb.resumes.get(assessmentId) || { parsed_data: {} };
  } else {
    const { data } = await supabaseAdmin
      .from('resumes')
      .select('parsed_data')
      .eq('assessment_id', assessmentId)
      .maybeSingle();
    resumeRecord = data;
  }

  const parsedResume = resumeRecord?.parsed_data || {};

  let resumeAnalysis: ResumeAnalysisResult = MOCK_RESUME_ANALYSIS;
  if (!MOCK_AI && parsedResume) {
    const resumePrompt = `Compare this resume parsed data with the required skill profile of a "${assessment.primary_skill}" engineer.
Rate suitability from 0 to 100.
Return JSON matching schema:
{
  "score": 85,
  "matched_skills": ["string matched skill"],
  "missing_skills": ["string missing skill"],
  "summary": "string profile match summary"
}
Parsed Resume:
${JSON.stringify(parsedResume)}`;
    resumeAnalysis = await askGPTJson<ResumeAnalysisResult>(resumePrompt, MOCK_RESUME_ANALYSIS);
  }

  // 7. MCQ response checking
  let mcqResponses: any[] = [];
  if (MOCK) {
    mcqResponses = mockMemoryDb.mcqResponses.get(assessmentId) || [];
  } else {
    const { data, error: mcqError } = await supabaseAdmin
      .from('mcq_responses')
      .select('is_correct')
      .eq('assessment_id', assessmentId);
    mcqResponses = data || [];
  }

  const correctMCQsCount = mcqResponses.filter((r) => r.is_correct).length;
  const mcqScore = mcqResponses.length > 0 ? (correctMCQsCount / mcqResponses.length) * 100 : 0;

  // 8. Anomaly detections from Keystroke telemetry log
  let telemetry: any = null;
  if (MOCK) {
    telemetry = mockMemoryDb.keystrokeLogs.get(assessmentId) || { paste_count: 0, tab_switch_count: 0, events: [], anomaly_flags: [] };
  } else {
    const { data } = await supabaseAdmin
      .from('keystroke_logs')
      .select('id, events, paste_count, tab_switch_count, anomaly_flags')
      .eq('assessment_id', assessmentId)
      .maybeSingle();
    telemetry = data;
  }

  const pasteCount = telemetry?.paste_count || 0;
  const tabSwitchCount = telemetry?.tab_switch_count || 0;
  let anomalyFlags = [...(telemetry?.anomaly_flags || [])];

  // Detect fast completion (completed in under 3 minutes)
  const startTime = assessment.started_at ? new Date(assessment.started_at).getTime() : 0;
  const submitTime = assessment.submitted_at ? new Date(assessment.submitted_at).getTime() : Date.now();
  const timeDiffMs = submitTime - startTime;
  const fastCompletion = timeDiffMs > 0 && timeDiffMs < 180000; // < 3 minutes

  if (fastCompletion && !anomalyFlags.includes('fast_completion')) {
    anomalyFlags.push('fast_completion');
  }

  // Explanation contradiction check
  const explanationContradiction = explanationAnalysis.coherent === false || explanationAnalysis.score < 50;
  if (explanationContradiction && !anomalyFlags.includes('explanation_contradiction')) {
    anomalyFlags.push('explanation_contradiction');
  }

  // Calculate composite passport scores
  const codeScore = passRate * 60 + codeAnalysis.score * 0.4;
  const explanationScore = explanationAnalysis.score;
  const resumeScore = resumeAnalysis.score;

  const passport = calculatePassport({
    codeScore,
    mcqScore,
    explanationScore,
    resumeScore,
    pasteCount,
    tabSwitchCount,
    fastCompletion,
    explanationContradiction,
  });

  // Compile skill levels maps
  const skillLevelMap: Record<string, string> = {};
  const extractedSkills = assessment.extracted_skills || [];
  extractedSkills.forEach((skill: string) => {
    // Map to beginner/intermediate/expert based on resume experience
    skillLevelMap[skill] = parsedResume?.experience_level || 'mid';
  });

  // 9. Persist into skill_passports table
  const passportRow = {
    assessment_id: assessmentId,
    code_score: Math.round(codeScore * 10) / 10,
    mcq_score: Math.round(mcqScore * 10) / 10,
    explanation_score: Math.round(explanationScore * 10) / 10,
    resume_score: Math.round(resumeScore * 10) / 10,
    final_score: passport.finalScore,
    base_confidence: passport.baseConfidence,
    confidence_penalty: passport.confidencePenalty,
    final_confidence: passport.finalConfidence,
    verified_skills: resumeAnalysis.matched_skills || extractedSkills || [],
    skill_level_map: skillLevelMap,
    code_snippet: code,
    video_url: videoUrl,
    keystroke_timeline: telemetry?.events || [],
    code_analysis: codeAnalysis,
    explanation_analysis: explanationAnalysis,
    resume_analysis: resumeAnalysis,
    anomaly_flags: anomalyFlags,
  };

  if (MOCK) {
    mockMemoryDb.skillPassports.set(assessmentId, passportRow);
    const current = mockMemoryDb.assessments.get(assessmentId);
    if (current) {
      current.status = 'completed';
    }
    const log = mockMemoryDb.keystrokeLogs.get(assessmentId);
    if (log) {
      log.anomaly_flags = anomalyFlags;
    }
  } else {
    // Select-then-upsert for skill passport
    const { data: existingPassport } = await supabaseAdmin
      .from('skill_passports')
      .select('id')
      .eq('assessment_id', assessmentId)
      .maybeSingle();

    if (existingPassport) {
      const { error: passportError } = await supabaseAdmin
        .from('skill_passports')
        .update(passportRow)
        .eq('id', existingPassport.id);

      if (passportError) throw passportError;
    } else {
      const { error: passportError } = await supabaseAdmin
        .from('skill_passports')
        .insert(passportRow);

      if (passportError) throw passportError;
    }

    // Update telemetry logs with updated flags
    if (telemetry?.id) {
      await supabaseAdmin
        .from('keystroke_logs')
        .update({ anomaly_flags: anomalyFlags })
        .eq('id', telemetry.id);
    }
  }

  console.log(`Pipeline finished successfully for assessment: ${assessmentId}`);
}
