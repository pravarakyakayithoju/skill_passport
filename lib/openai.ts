import OpenAI from 'openai';
import { MOCK_AI } from './mock';

export const isGroq =
  !!process.env.GROQ_API_KEY ||
  (!!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('gsk_'));

export const CHAT_MODEL = isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o';

export const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || 'placeholder-key',
  baseURL: isGroq ? 'https://api.groq.com/openai/v1' : undefined,
});

/**
 * Call GPT-4o (or Groq Llama 3.3) and retrieve a structured JSON object response.
 * Handles fallback/mock behavior if in Mock Mode.
 */
export async function askGPTJson<T>(prompt: string, fallbackData: T): Promise<T> {
  if (MOCK_AI) {
    return fallbackData;
  }

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert technical evaluator. You must return only a valid JSON object matching the requested schema. Do not enclose the output in ```json or markdown blocks.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from model');
    }

    return JSON.parse(content) as T;
  } catch (error) {
    console.error('Error in askGPTJson:', error);
    return fallbackData;
  }
}
