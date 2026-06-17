import { MOCK_JUDGE0 } from './mock';

export const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
};

interface TestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  error?: string;
}

/**
 * Automatically extracts the function name from starter code.
 */
function extractFunctionName(code: string, language: string): string {
  if (language === 'javascript' || language === 'typescript') {
    const match = code.match(/function\s+(\w+)/);
    return match ? match[1] : 'solution';
  } else if (language === 'python') {
    const match = code.match(/def\s+(\w+)/);
    return match ? match[1] : 'solution';
  }
  return 'solution';
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
