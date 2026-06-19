import { supabaseAdmin } from './supabase/server';
import { MOCK, MOCK_AI, MOCK_JUDGE0, MOCK_CODING_QUESTION, MOCK_MCQ_POOL, mockMemoryDb } from './mock';
import { askGPTJson } from './openai';
import { executeCodeInJudge0, isLLMSandboxActive } from './judge0';

interface RawCodingQuestion {
  language: string;
  title: string;
  description: string;
  starter_code: string;
  visible_tests: Array<{ input: string; expected: string }>;
  hidden_tests: Array<{ input: string; expected: string }>;
  reference_solution: string;
}

interface RawMCQPool {
  questions: Array<{
    skill: string;
    difficulty: number;
    question: string;
    options: { A: string; B: string; C: string; D: string };
    correct: 'A' | 'B' | 'C' | 'D';
    explanation: string;
  }>;
}

/**
 * Generate coding question and MCQ pool, validate tests via Judge0, and write to DB.
 */
export async function generateQuestions(
  assessmentId: string,
  primarySkill: string,
  extractedSkills: string[]
): Promise<void> {
  // If AI generation is mocked:
  if (MOCK_AI) {
    const codingRow = {
      assessment_id: assessmentId,
      language: MOCK_CODING_QUESTION.language,
      title: MOCK_CODING_QUESTION.title,
      description: MOCK_CODING_QUESTION.description,
      starter_code: MOCK_CODING_QUESTION.starter_code,
      visible_tests: MOCK_CODING_QUESTION.visible_tests,
      hidden_tests: MOCK_CODING_QUESTION.hidden_tests,
      reference_solution: MOCK_CODING_QUESTION.reference_solution,
    };

    const mcqsToInsert = MOCK_MCQ_POOL.map((q, idx) => ({
      id: `mcq-q-${assessmentId}-${idx}`,
      assessment_id: assessmentId,
      skill: q.skill,
      difficulty: q.difficulty,
      question: q.question,
      options: q.options,
      correct: q.correct,
      explanation: q.explanation,
    }));

    if (MOCK) {
      mockMemoryDb.codingQuestions.set(assessmentId, codingRow);
      mockMemoryDb.mcqQuestions.set(assessmentId, mcqsToInsert);
    } else {
      const { error: codingError } = await supabaseAdmin
        .from('coding_questions')
        .insert(codingRow);
      if (codingError) throw new Error(`Failed to save coding question: ${codingError.message}`);

      const { error: mcqError } = await supabaseAdmin
        .from('mcq_questions')
        .insert(mcqsToInsert);
      if (mcqError) throw new Error(`Failed to save MCQs: ${mcqError.message}`);
    }
    return;
  }

  // Real GPT-4o (or Groq) and Judge0 validation flow:
  let generatedQuestion: RawCodingQuestion | null = null;
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    
    // Step 1: Generate coding question via GPT-4o
    const codingPrompt = `Generate ONE highly detailed and comprehensive coding question for a candidate skilled in "${primarySkill}".
Difficulty should be medium, suitable for a 8-minute implementation.

The description field MUST be extremely detailed and well-formatted in Markdown. It must include:
1. **Problem Statement**: Clear, formal explanation of the problem.
2. **Examples**: Walkthroughs of the example cases explaining how the input maps to the output.
3. **Constraints**: Clear constraints (e.g. array length, integer ranges, time and space complexity expectation).
4. **Edge Cases**: Mentions of edge cases to consider (e.g. empty lists, negative numbers).

Output format MUST be JSON matching the following schema:
{
  "language": "javascript" | "python",
  "title": "string",
  "description": "string (highly detailed markdown description)",
  "starter_code": "string (empty function boilerplate/stub containing only the function signature, JSDoc/type comments, and an empty body or return/pass. It MUST NOT contain any solution logic or implementation)",
  "visible_tests": [{"input": "string (JSON array of args)", "expected": "string (JSON expected result)"}],
  "hidden_tests": [{"input": "string (JSON array of args)", "expected": "string (JSON expected result)"}],
  "reference_solution": "string (complete, working implementation of the function)"
}
Generate exactly 2 visible_tests (examples) and exactly 6 hidden_tests.
Only support "javascript" or "python" for language.`;

    const rawQuestion = await askGPTJson<RawCodingQuestion | null>(codingPrompt, null);
    if (!rawQuestion) continue;

    // Step 2: Validate the generated tests using the reference solution in Judge0 (or mock it if MOCK_JUDGE0 is active)
    const validatedVisible: typeof rawQuestion.visible_tests = [];
    const validatedHidden: typeof rawQuestion.hidden_tests = [];

    const bypassValidation = MOCK_JUDGE0;

    // Run visible tests
    for (const test of rawQuestion.visible_tests) {
      const res = bypassValidation 
        ? { passed: true, actual: test.expected }
        : await executeCodeInJudge0(
            rawQuestion.reference_solution,
            rawQuestion.language,
            test.input,
            test.expected,
            rawQuestion.starter_code
          );
      if (res.passed) {
        validatedVisible.push(test);
      }
    }

    // Run hidden tests
    for (const test of rawQuestion.hidden_tests) {
      const res = bypassValidation
        ? { passed: true, actual: test.expected }
        : await executeCodeInJudge0(
            rawQuestion.reference_solution,
            rawQuestion.language,
            test.input,
            test.expected,
            rawQuestion.starter_code
          );
      if (res.passed) {
        validatedHidden.push(test);
      }
    }

    // Check if at least 4 hidden tests passed or if sandbox execution is bypassed
    if (bypassValidation || (validatedHidden.length >= 4 && validatedVisible.length > 0)) {
      generatedQuestion = {
        ...rawQuestion,
        visible_tests: validatedVisible,
        hidden_tests: validatedHidden,
      };
      break;
    }
  }

  if (!generatedQuestion) {
    throw new Error('Failed to generate a valid coding question after multiple attempts.');
  }

  // Insert validated coding question to Supabase or memory DB
  const codingRow = {
    assessment_id: assessmentId,
    language: generatedQuestion.language,
    title: generatedQuestion.title,
    description: generatedQuestion.description,
    starter_code: generatedQuestion.starter_code,
    visible_tests: generatedQuestion.visible_tests,
    hidden_tests: generatedQuestion.hidden_tests,
    reference_solution: generatedQuestion.reference_solution,
  };

  if (MOCK) {
    mockMemoryDb.codingQuestions.set(assessmentId, codingRow);
  } else {
    const { error: codingError } = await supabaseAdmin
      .from('coding_questions')
      .insert(codingRow);
    if (codingError) throw new Error(`Failed to save coding question: ${codingError.message}`);
  }

  // Step 3: Generate the MCQ pool (10 questions, 2 at each difficulty level 1-5)
  const skillsToAssess = extractedSkills.length > 0 ? extractedSkills.join(', ') : primarySkill;
  const mcqPrompt = `Generate exactly 10 multiple-choice questions for a candidate skilled in the following technologies: ${skillsToAssess}.
Provide exactly 2 questions at each difficulty level 1 through 5 (1 is beginner, 5 is advanced).
Output format MUST be JSON matching the following schema:
{
  "questions": [
    {
      "skill": "string",
      "difficulty": 1 | 2 | 3 | 4 | 5,
      "question": "string",
      "options": {
        "A": "string",
        "B": "string",
        "C": "string",
        "D": "string"
      },
      "correct": "A" | "B" | "C" | "D",
      "explanation": "string"
    }
  ]
}
Make sure options are logical, single choice is strictly correct, and difficulty distribution is exactly 2 questions per level.`;

  const rawMCQs = await askGPTJson<RawMCQPool | null>(mcqPrompt, null);
  if (!rawMCQs || !rawMCQs.questions || rawMCQs.questions.length === 0) {
    throw new Error('Failed to generate MCQ pool.');
  }

  const mcqRows = rawMCQs.questions.map((q, idx) => ({
    id: crypto.randomUUID(),
    assessment_id: assessmentId,
    skill: q.skill || primarySkill,
    difficulty: q.difficulty,
    question: q.question,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation,
  }));

  if (MOCK) {
    mockMemoryDb.mcqQuestions.set(assessmentId, mcqRows);
  } else {
    const { error: mcqError } = await supabaseAdmin
      .from('mcq_questions')
      .insert(mcqRows);
    if (mcqError) throw new Error(`Failed to save MCQs: ${mcqError.message}`);
  }
}
