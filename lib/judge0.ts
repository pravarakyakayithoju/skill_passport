import { MOCK_JUDGE0 } from './mock';
import { openai, CHAT_MODEL } from './openai';

export const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  csharp: 51,
};

interface TestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  error?: string;
}

export function isLLMSandboxActive(): boolean {
  return !process.env.JUDGE0_API_KEY && (!!process.env.GROQ_API_KEY || !!process.env.OPENAI_API_KEY);
}

/**
 * Executes/simulates code execution using the LLM (Groq/OpenAI) when Judge0 is unavailable.
 */
async function executeCodeViaLLM(
  sourceCode: string,
  language: string,
  testInput: string,
  testExpected: string,
  starterCode: string
): Promise<{ passed: boolean; actual: string; error?: string }> {
  const functionName = extractFunctionName(starterCode, language);

  const prompt = `You are a precise, sandboxed code execution engine.
Your task is to analyze and simulate the execution of the user's code for a specific test case. Do not execute anything in reality, but simulate it exactly according to the semantics of the language.

Language: ${language}

Starter Code:
\`\`\`${language}
${starterCode}
\`\`\`

User's Code:
\`\`\`${language}
${sourceCode}
\`\`\`

Primary Function to Execute: "${functionName}"

Test Input (arguments passed to "${functionName}", structured as a JSON array of positional arguments):
${testInput}

For example, if the input is \`[[2, 7, 11, 15], 9]\`, you should simulate calling \`${functionName}([2, 7, 11, 15], 9)\`.

You MUST respond with a JSON object matching this schema:
{
  "thought": "Write down a detailed step-by-step trace of each line of code executed with the given input, showing variable values at each step, to guarantee absolute accuracy.",
  "actual": "The string representation of the final output or return value. For arrays/objects, return them as serialized JSON strings (e.g., \\"[0,1]\\"). If it's a primitive, return its string representation (e.g. \\"6\\" or \\"true\\").",
  "error": "A string describing the compilation or runtime error if one occurred, otherwise null."
}

Do not include any explanation, markdown formatting, or text outside the JSON object. Do not wrap the JSON object in code blocks.`;

  const models = [CHAT_MODEL];
  const isGroq = CHAT_MODEL.includes('llama');
  if (isGroq && CHAT_MODEL !== 'llama-3.1-8b-instant') {
    models.push('llama-3.1-8b-instant');
  }

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a code execution simulator. You output ONLY a raw JSON object and nothing else. No markdown, no pre-amble, no post-amble.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('Empty response from LLM code executor');
      }

      const res = JSON.parse(content) as { actual: any; error?: string | null };

      const hasRealError = res.error && 
                           res.error !== 'null' && 
                           res.error !== 'none' && 
                           res.error !== 'None' && 
                           String(res.error).trim() !== '';

      if (hasRealError) {
        return { passed: false, actual: '', error: String(res.error) };
      }

      // Convert actual to a string if it's not already
      let actualStr = '';
      if (res.actual !== undefined && res.actual !== null) {
        if (typeof res.actual === 'object') {
          actualStr = JSON.stringify(res.actual);
        } else {
          actualStr = String(res.actual).trim();
        }
      }

      const expectedStr = (testExpected || '').trim();

      let passed = false;
      try {
        // Attempt strict JSON match
        const parsedActual = JSON.parse(actualStr);
        const parsedExpected = JSON.parse(expectedStr);
        passed = JSON.stringify(parsedActual) === JSON.stringify(parsedExpected);
      } catch {
        // Fall back to clean string match
        passed = actualStr === expectedStr;
      }

      return { passed, actual: actualStr };
    } catch (error: any) {
      console.error(`LLM Code Execution error with model "${model}":`, error.message || error);
      if (i < models.length - 1) {
        console.warn(`Attempting fallback to next model...`);
      } else {
        return { passed: false, actual: '', error: error.message || 'LLM execution simulation error' };
      }
    }
  }

  return { passed: false, actual: '', error: 'LLM execution simulation failed all models' };
}

/**
 * Automatically extracts the function name from starter code.
 */
function extractFunctionName(code: string, language: string): string {
  const lang = (language || '').toLowerCase().trim();
  if (lang === 'javascript' || lang === 'typescript') {
    const match = code.match(/function\s+(\w+)/);
    return match ? match[1] : 'solution';
  } else if (lang === 'python') {
    const match = code.match(/def\s+(\w+)/);
    return match ? match[1] : 'solution';
  } else {
    // Java, C, C++, C# style matches: type name(args)
    // Find name followed by parenthesis, avoiding common language keywords
    const matches = [];
    const regex = /(\w+)\s*\(/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
      matches.push(match);
    }
    const keywords = ['if', 'for', 'while', 'catch', 'switch', 'return', 'class', 'public', 'private', 'protected', 'static', 'new', 'override', 'void', 'int', 'float', 'double', 'char', 'bool', 'boolean', 'string'];
    for (const m of matches) {
      const name = m[1];
      if (!keywords.includes(name)) {
        return name;
      }
    }
    return 'solution';
  }
}

/**
 * Creates the execution payload for Judge0 by appending a test runner.
 */
function buildExecutionCode(code: string, language: string, testInput: string, functionName: string): string {
  if (language === 'javascript') {
    return `
${code}

try {
  const inputArgs = ${testInput};
  const result = ${functionName}(...inputArgs);
  console.log(JSON.stringify(result));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
`;
  } else if (language === 'python') {
    return `
${code}

import json
import sys

try {
    input_args = json.loads('${testInput.replace(/'/g, "\\'")}')
    result = ${functionName}(*input_args)
    print(json.dumps(result))
except Exception as e:
    print(str(e), file=sys.stderr)
    sys.exit(1)
`;
  }
  return code;
}

/**
 * Submits a code execution request to Judge0 and polls the status.
 */
export async function executeCodeInJudge0(
  sourceCode: string,
  language: string,
  testInput: string,
  testExpected: string,
  starterCode: string
): Promise<{ passed: boolean; actual: string; error?: string }> {
  // 1. Check if Judge0 is disabled but LLM is active
  if (isLLMSandboxActive()) {
    return executeCodeViaLLM(sourceCode, language, testInput, testExpected, starterCode);
  }

  if (MOCK_JUDGE0) {
    // Standard mock pass (simulate delay of 200ms)
    await new Promise((r) => setTimeout(r, 200));
    return { passed: true, actual: testExpected };
  }

  const apiKey = process.env.JUDGE0_API_KEY;
  const apiUrl = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
  const languageId = LANGUAGE_IDS[language.toLowerCase()] || 63;

  const functionName = extractFunctionName(starterCode, language);
  const fullSourceCode = buildExecutionCode(sourceCode, language, testInput, functionName);

  try {
    // 1. Submit code to Judge0
    const res = await fetch(`${apiUrl}/submissions?wait=false`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-key': apiKey || '',
        'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
      },
      body: JSON.stringify({
        source_code: fullSourceCode,
        language_id: languageId,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { passed: false, actual: '', error: `Judge0 submission failed: ${errorText}` };
    }

    const { token } = await res.json();

    // 2. Poll for results (max 10 polls, 1s interval)
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const statusRes = await fetch(`${apiUrl}/submissions/${token}`, {
        headers: {
          'x-rapidapi-key': apiKey || '',
          'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
        },
      });

      if (!statusRes.ok) continue;

      const result = await statusRes.json();
      const statusId = result.status?.id;

      // status.id > 2 means finished (3: Accepted, 4: Wrong Answer, etc.)
      if (statusId && statusId > 2) {
        const stdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString().trim() : '';
        const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString().trim() : '';
        const compileOutput = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString().trim() : '';

        if (stderr || compileOutput) {
          return {
            passed: false,
            actual: '',
            error: stderr || compileOutput,
          };
        }

        // Clean expected output and stdout for strict JSON match or string match
        let passed = false;
        try {
          // Attempt strict JSON match
          const parsedStdout = JSON.parse(stdout);
          const parsedExpected = JSON.parse(testExpected);
          passed = JSON.stringify(parsedStdout) === JSON.stringify(parsedExpected);
        } catch {
          // Fall back to clean string match
          passed = stdout === testExpected.trim();
        }

        return { passed, actual: stdout };
      }
    }

    return { passed: false, actual: '', error: 'Judge0 execution timed out' };
  } catch (error: any) {
    console.error('Judge0 invocation error:', error);
    return { passed: false, actual: '', error: error.message || 'Judge0 request error' };
  }
}

/**
 * Run candidate code against multiple test cases in Judge0.
 */
export async function runHiddenTests(
  code: string,
  language: string,
  testCases: Array<{ input: string; expected: string }>,
  starterCode: string
): Promise<{ passed: number; total: number; results: TestResult[] }> {
  const results: TestResult[] = [];
  let passedCount = 0;

  for (const test of testCases) {
    const result = await executeCodeInJudge0(code, language, test.input, test.expected, starterCode);
    results.push({
      input: test.input,
      expected: test.expected,
      actual: result.actual,
      passed: result.passed,
      error: result.error,
    });

    if (result.passed) {
      passedCount++;
    }
  }

  return {
    passed: passedCount,
    total: testCases.length,
    results,
  };
}
