import { supabaseAdmin } from './supabase/server';
import { MOCK, MOCK_AI, MOCK_JUDGE0, MOCK_CODING_QUESTION, MOCK_MCQ_POOL, mockMemoryDb } from './mock';
import { askGPTJson } from './openai';
import { executeCodeInJudge0, isLLMSandboxActive } from './judge0';

interface LangQuestion {
  starter_code: string;
  reference_solution: string;
}

interface RawMultiCodingQuestion {
  title: string;
  description: string;
  visible_tests: Array<{ input: string; expected: string }>;
  hidden_tests: Array<{ input: string; expected: string }>;
  javascript: LangQuestion;
  python: LangQuestion;
  java: LangQuestion;
  cpp: LangQuestion;
  c: LangQuestion;
  csharp: LangQuestion;
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

function extractStarterCode(referenceSolution: string, language: string): string {
  const lang = (language || '').toLowerCase().trim();
  if (!referenceSolution) {
    if (lang === 'python') return `def solution():\n    # Write your code here\n    pass`;
    if (lang === 'java') return `class Solution {\n    public int[] solution() {\n        // Write your code here\n    }\n}`;
    if (lang === 'cpp') return `class Solution {\npublic:\n    void solution() {\n        // Write your code here\n    }\n};`;
    if (lang === 'c') return `void solution() {\n    // Write your code here\n}`;
    if (lang === 'csharp') return `public class Solution {\n    public void solution() {\n        // Write your code here\n    }\n}`;
    return `function solution() {\n  // Write your code here\n}`;
  }

  if (lang === 'python') {
    const match = referenceSolution.match(/def\s+\w+\s*\(.*?\)\s*:/);
    if (match) return `${match[0]}\n    # Write your code here\n    pass`;
    return `def solution():\n    # Write your code here\n    pass`;
  } else if (lang === 'javascript' || lang === 'typescript') {
    const match = referenceSolution.match(/function\s+\w+\s*\(.*?\)/);
    if (match) return `${match[0]} {\n  // Write your code here\n}`;
    const arrowMatch = referenceSolution.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:\(.*?\)|[^=]+?)\s*=>/);
    if (arrowMatch) return `${arrowMatch[0]} {\n  // Write your code here\n}`;
    return `function solution() {\n  // Write your code here\n}`;
  }
  
  return referenceSolution;
}

function sanitizeRawQuestion(q: any): RawMultiCodingQuestion {
  if (!q) {
    throw new Error('Raw question response is empty.');
  }

  const title = q.title || 'Coding Challenge';
  const description = q.description || 'Solve the coding challenge.';

  const visible_tests = Array.isArray(q.visible_tests) 
    ? q.visible_tests.map((t: any) => ({
        input: typeof t.input === 'string' ? t.input : JSON.stringify(t.input),
        expected: typeof t.expected === 'string' ? t.expected : JSON.stringify(t.expected),
      }))
    : [];

  const hidden_tests = Array.isArray(q.hidden_tests)
    ? q.hidden_tests.map((t: any) => ({
        input: typeof t.input === 'string' ? t.input : JSON.stringify(t.input),
        expected: typeof t.expected === 'string' ? t.expected : JSON.stringify(t.expected),
      }))
    : [];

  const sanitizeLang = (langData: any, lang: string) => {
    const data = langData || {};
    const reference_solution = data.reference_solution || '';
    
    let starter_code = data.starter_code;
    if (!starter_code || typeof starter_code !== 'string') {
      starter_code = extractStarterCode(reference_solution, lang);
    }

    return {
      starter_code,
      reference_solution,
    };
  };

  return {
    title,
    description,
    visible_tests,
    hidden_tests,
    javascript: sanitizeLang(q.javascript, 'javascript'),
    python: sanitizeLang(q.python, 'python'),
    java: sanitizeLang(q.java, 'java'),
    cpp: sanitizeLang(q.cpp, 'cpp'),
    c: sanitizeLang(q.c, 'c'),
    csharp: sanitizeLang(q.csharp, 'csharp'),
  };
}

function sanitizeRawMCQs(mcqPool: any, primarySkill: string): RawMCQPool {
  if (!mcqPool || !Array.isArray(mcqPool.questions)) {
    return { questions: [] };
  }
  const cleanQuestions = mcqPool.questions.map((q: any) => {
    const options = q.options || {};
    return {
      skill: q.skill || primarySkill,
      difficulty: typeof q.difficulty === 'number' ? q.difficulty : 3,
      question: q.question || 'Multiple choice question',
      options: {
        A: options.A || 'Option A',
        B: options.B || 'Option B',
        C: options.C || 'Option C',
        D: options.D || 'Option D',
      },
      correct: (['A', 'B', 'C', 'D'].includes(q.correct) ? q.correct : 'A') as 'A' | 'B' | 'C' | 'D',
      explanation: q.explanation || '',
    };
  });
  return { questions: cleanQuestions };
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
      language: 'multi',
      title: MOCK_CODING_QUESTION.title,
      description: MOCK_CODING_QUESTION.description,
      starter_code: JSON.stringify({
        javascript: MOCK_CODING_QUESTION.starter_code,
        python: `def twoSum(nums, target):\n    # Write your code here\n    pass`,
        java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your code here\n    }\n}`,
        cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your code here\n    }\n};`,
        c: `int* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    // Write your code here\n}`,
        csharp: `public class Solution {\n    public int[] TwoSum(int[] nums, int target) {\n        // Write your code here\n    }\n}`
      }),
      visible_tests: MOCK_CODING_QUESTION.visible_tests,
      hidden_tests: MOCK_CODING_QUESTION.hidden_tests,
      reference_solution: JSON.stringify({
        javascript: MOCK_CODING_QUESTION.reference_solution,
        python: `def twoSum(nums, target):\n    mapping = {}\n    for i, num in enumerate(nums):\n        comp = target - num\n        if comp in mapping:\n            return [mapping[comp], i]\n        mapping[num] = i\n    return []`,
        java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        java.util.Map<Integer, Integer> map = new java.util.HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n            if (map.containsKey(complement)) {\n                return new int[] { map.get(complement), i };\n            }\n            map.put(nums[i], i);\n        }\n        return new int[0];\n    }\n}`,
        cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> map;\n        for (int i = 0; i < nums.size(); i++) {\n            int complement = target - nums[i];\n            if (map.find(complement) != map.end()) {\n                return {map[complement], i};\n            }\n            map[nums[i]] = i;\n        }\n        return {};\n    }\n};`,
        c: `int* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    *returnSize = 2;\n    int* res = (int*)malloc(2 * sizeof(int));\n    for (int i = 0; i < numsSize; i++) {\n        for (int j = i + 1; j < numsSize; j++) {\n            if (nums[i] + nums[j] == target) {\n                res[0] = i; res[1] = j;\n                return res;\n            }\n        }\n    }\n    return res;\n}`,
        csharp: `public class Solution {\n    public int[] TwoSum(int[] nums, int target) {\n        var map = new System.Collections.Generic.Dictionary<int, int>();\n        for (int i = 0; i < nums.Length; i++) {\n            int complement = target - nums[i];\n            if (map.ContainsKey(complement)) {\n                return new int[] { map[complement], i };\n            }\n            map[nums[i]] = i;\n        }\n        return new int[0];\n    }\n}`
      }),
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
  let generatedQuestion: RawMultiCodingQuestion | null = null;
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    
    // Step 1: Generate coding question via GPT-4o
    const codingPrompt = `Generate ONE highly detailed coding question for a candidate.
Difficulty should be medium, suitable for a 8-minute implementation.

The description field MUST be language-agnostic and well-formatted in Markdown. It must include:
1. **Problem Statement**: Clear, formal explanation of the problem.
2. **Examples**: Walkthroughs of the example cases explaining how the input maps to the output.
3. **Constraints**: Clear constraints (e.g. array length, integer ranges, time and space complexity expectation).
4. **Edge Cases**: Mentions of edge cases to consider (e.g. empty lists, negative numbers).

Output format MUST be JSON matching the following schema:
{
  "title": "string",
  "description": "string (highly detailed markdown description)",
  "visible_tests": [{"input": "string (JSON array of args)", "expected": "string (JSON expected result)"}],
  "hidden_tests": [{"input": "string (JSON array of args)", "expected": "string (JSON expected result)"}],
  "javascript": {
    "starter_code": "string (empty starter code boilerplate/stub)",
    "reference_solution": "string (complete, working implementation of the function)"
  },
  "python": {
    "starter_code": "string (empty starter code boilerplate/stub)",
    "reference_solution": "string (complete, working implementation of the function)"
  },
  "java": {
    "starter_code": "string (empty starter code boilerplate/stub)",
    "reference_solution": "string (complete, working implementation of the function)"
  },
  "cpp": {
    "starter_code": "string (empty starter code boilerplate/stub)",
    "reference_solution": "string (complete, working implementation of the function)"
  },
  "c": {
    "starter_code": "string (empty starter code boilerplate/stub)",
    "reference_solution": "string (complete, working implementation of the function)"
  },
  "csharp": {
    "starter_code": "string (empty starter code boilerplate/stub)",
    "reference_solution": "string (complete, working implementation of the function)"
  }
}
Generate exactly 2 visible_tests (examples) and exactly 6 hidden_tests.`;

    const rawQuestion = await askGPTJson<any>(codingPrompt, null);
    if (!rawQuestion) continue;

    let sanitizedQuestion: RawMultiCodingQuestion;
    try {
      sanitizedQuestion = sanitizeRawQuestion(rawQuestion);
    } catch (e) {
      console.error('Failed to sanitize raw coding question:', e);
      continue;
    }

    // Step 2: Validate the generated tests using the reference solution in Judge0 (or mock it if MOCK_JUDGE0 is active)
    const bypassValidation = MOCK_JUDGE0;
    let jsPassed = bypassValidation;
    let pyPassed = bypassValidation;

    if (!bypassValidation) {
      // Validate Javascript
      let jsVisibleCount = 0;
      for (const test of sanitizedQuestion.visible_tests) {
        const res = await executeCodeInJudge0(
          sanitizedQuestion.javascript.reference_solution,
          'javascript',
          test.input,
          test.expected,
          sanitizedQuestion.javascript.starter_code
        );
        if (res.passed) jsVisibleCount++;
      }
      let jsHiddenCount = 0;
      for (const test of sanitizedQuestion.hidden_tests) {
        const res = await executeCodeInJudge0(
          sanitizedQuestion.javascript.reference_solution,
          'javascript',
          test.input,
          test.expected,
          sanitizedQuestion.javascript.starter_code
        );
        if (res.passed) jsHiddenCount++;
      }
      jsPassed = jsHiddenCount >= 4 && jsVisibleCount > 0;

      // Validate Python
      let pyVisibleCount = 0;
      for (const test of sanitizedQuestion.visible_tests) {
        const res = await executeCodeInJudge0(
          sanitizedQuestion.python.reference_solution,
          'python',
          test.input,
          test.expected,
          sanitizedQuestion.python.starter_code
        );
        if (res.passed) pyVisibleCount++;
      }
      let pyHiddenCount = 0;
      for (const test of sanitizedQuestion.hidden_tests) {
        const res = await executeCodeInJudge0(
          sanitizedQuestion.python.reference_solution,
          'python',
          test.input,
          test.expected,
          sanitizedQuestion.python.starter_code
        );
        if (res.passed) pyHiddenCount++;
      }
      pyPassed = pyHiddenCount >= 4 && pyVisibleCount > 0;
    }

    // Both languages must pass validation (or validation is bypassed)
    if (jsPassed && pyPassed) {
      generatedQuestion = sanitizedQuestion;
      break;
    }
  }

  if (!generatedQuestion) {
    throw new Error('Failed to generate a valid coding question after multiple attempts.');
  }

  // Insert validated coding question to Supabase or memory DB
  const codingRow = {
    assessment_id: assessmentId,
    language: 'multi',
    title: generatedQuestion.title,
    description: generatedQuestion.description,
    starter_code: JSON.stringify({
      javascript: generatedQuestion.javascript.starter_code,
      python: generatedQuestion.python.starter_code,
      java: generatedQuestion.java.starter_code,
      cpp: generatedQuestion.cpp.starter_code,
      c: generatedQuestion.c.starter_code,
      csharp: generatedQuestion.csharp.starter_code,
    }),
    visible_tests: generatedQuestion.visible_tests,
    hidden_tests: generatedQuestion.hidden_tests,
    reference_solution: JSON.stringify({
      javascript: generatedQuestion.javascript.reference_solution,
      python: generatedQuestion.python.reference_solution,
      java: generatedQuestion.java.reference_solution,
      cpp: generatedQuestion.cpp.reference_solution,
      c: generatedQuestion.c.reference_solution,
      csharp: generatedQuestion.csharp.reference_solution,
    }),
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

  const rawMCQs = await askGPTJson<any>(mcqPrompt, null);
  let sanitizedMCQs = sanitizeRawMCQs(rawMCQs, primarySkill);
  
  if (sanitizedMCQs.questions.length === 0) {
    console.warn('Failed to generate MCQs dynamically, falling back to mock MCQs pool.');
    // Populate with mock MCQs but mapped to the current assessmentId and primarySkill
    const fallbackMCQs = MOCK_MCQ_POOL.map(q => ({
      skill: primarySkill,
      difficulty: q.difficulty,
      question: q.question.replace(/JavaScript/gi, primarySkill).replace(/JS/gi, primarySkill),
      options: q.options,
      correct: q.correct as 'A' | 'B' | 'C' | 'D',
      explanation: q.explanation,
    }));
    sanitizedMCQs = { questions: fallbackMCQs };
  }

  const mcqRows = sanitizedMCQs.questions.map((q, idx) => ({
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
