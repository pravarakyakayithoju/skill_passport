import { NextRequest } from 'next/server';
import { executeCodeInJudge0, isLLMSandboxActive } from '@/lib/judge0';
import { MOCK_JUDGE0 } from '@/lib/mock';

export async function POST(req: NextRequest) {
  try {
    const { code, language, starterCode, visibleTests } = await req.json();

    if (!code || !language || !visibleTests || !Array.isArray(visibleTests)) {
      return Response.json({ error: 'Missing run parameters' }, { status: 400 });
    }

    const results = [];
    for (const test of visibleTests) {
      const res = await executeCodeInJudge0(code, language, test.input, test.expected, starterCode);
      results.push({
        input: test.input,
        expected: test.expected,
        actual: res.actual,
        passed: res.passed,
        error: res.error,
      });
    }

    const llmActive = isLLMSandboxActive();
    const sandboxType = process.env.JUDGE0_API_KEY ? 'judge0' : (llmActive ? 'llm' : 'none');
    const isSandboxDisabled = MOCK_JUDGE0 && !llmActive;

    return Response.json({ results, isSandboxDisabled, sandboxType });
  } catch (error: any) {
    console.error('API run tests error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
