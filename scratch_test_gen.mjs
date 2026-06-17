import fs from 'fs';
import OpenAI from 'openai';

// Read .env.local manually
const envLocalContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
for (const line of envLocalContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  }
}

const apiKey = envVars.GROQ_API_KEY || envVars.OPENAI_API_KEY;
const isGroq = !!envVars.GROQ_API_KEY || (!!envVars.OPENAI_API_KEY && envVars.OPENAI_API_KEY.startsWith('gsk_'));

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: isGroq ? 'https://api.groq.com/openai/v1' : undefined,
});

async function test() {
  console.log('Starting Groq coding question generation test...');
  try {
    const codingPrompt = `Generate ONE coding question for a candidate skilled in "javascript".
Difficulty should be medium, suitable for a 8-minute implementation.
Output format MUST be JSON matching the following schema:
{
  "language": "javascript",
  "title": "string",
  "description": "string (markdown allowed)",
  "starter_code": "string (function boilerplate)",
  "visible_tests": [{"input": "string (JSON array of args)", "expected": "string (JSON expected result)"}],
  "hidden_tests": [{"input": "string (JSON array of args)", "expected": "string (JSON expected result)"}],
  "reference_solution": "string (working code for starter function)"
}
Generate exactly 2 visible_tests (examples) and exactly 6 hidden_tests.
Only support "javascript" or "python" for language. Include clear instructions.`;

    const start = Date.now();
    const response = await openai.chat.completions.create({
      model: isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert technical evaluator. You must return only a valid JSON object matching the requested schema. Do not enclose the output in ```json or markdown blocks.',
        },
        {
          role: 'user',
          content: codingPrompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    console.log(`Response received in ${((Date.now() - start) / 1000).toFixed(2)}s`);
    const content = response.choices[0]?.message?.content;
    console.log('Response content:', content);
    if (content) {
      const parsed = JSON.parse(content);
      console.log('Parsed successfully! Title:', parsed.title);
    }
  } catch (err) {
    console.error('Groq call error:', err);
  }
}

test();
