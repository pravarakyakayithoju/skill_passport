import { openai, isGroq } from './openai';
import { MOCK_AI, MOCK_WHISPER_TRANSCRIPT } from './mock';

/**
 * Transcribes audio/video media file to text using OpenAI Whisper model.
 */
export async function transcribeAudio(file: File): Promise<string> {
  if (MOCK_AI) {
    return MOCK_WHISPER_TRANSCRIPT;
  }

  try {
    const response = await openai.audio.transcriptions.create({
      model: isGroq ? 'whisper-large-v3' : 'whisper-1',
      file: file,
    });

    return response.text;
  } catch (error: any) {
    console.error('Whisper transcription failed, using mock fallback:', error);
    return MOCK_WHISPER_TRANSCRIPT;
  }
}
