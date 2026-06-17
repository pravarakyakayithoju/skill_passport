import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { MOCK, mockMemoryDb } from '@/lib/mock';

export async function POST(req: NextRequest) {
  try {
    const {
      assessmentId,
      questionId,
      selectedAnswer,
      timeTakenMs,
      sequenceNumber,
      difficultyLevel,
    } = await req.json();

    if (!assessmentId || !questionId || !selectedAnswer) {
      return Response.json({ error: 'Missing submission parameters' }, { status: 400 });
    }

    if (MOCK) {
      const allQuestions = mockMemoryDb.mcqQuestions.get(assessmentId) || [];
      const question = allQuestions.find((q) => q.id === questionId);
      
      const isCorrect = question
        ? selectedAnswer.trim().toUpperCase() === question.correct.trim().toUpperCase()
        : Math.random() > 0.3; // Fallback random correctness if question not found

      const responseRow = {
        assessment_id: assessmentId,
        mcq_question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        difficulty_level: difficultyLevel || 1,
        time_taken_ms: timeTakenMs || 0,
        sequence_number: sequenceNumber || 1,
      };

      const existingResponses = mockMemoryDb.mcqResponses.get(assessmentId) || [];
      mockMemoryDb.mcqResponses.set(assessmentId, [...existingResponses, responseRow]);

      return Response.json({
        isCorrect,
        explanation: question?.explanation || 'Mock explanation: Nice attempt!',
      });
    }

    // 1. Fetch correct answer and explanation from the mcq_questions table
    const { data: question, error: questionError } = await supabaseAdmin
      .from('mcq_questions')
      .select('correct, explanation')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      console.error('Error fetching question answer key:', questionError);
      return Response.json({ error: 'Question not found in database' }, { status: 404 });
    }

    const isCorrect = selectedAnswer.trim().toUpperCase() === question.correct.trim().toUpperCase();

    // 2. Insert the response into the mcq_responses table
    const { error: insertError } = await supabaseAdmin
      .from('mcq_responses')
      .insert({
        assessment_id: assessmentId,
        mcq_question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        difficulty_level: difficultyLevel || 1,
        time_taken_ms: timeTakenMs || 0,
        sequence_number: sequenceNumber || 1,
      });

    if (insertError) {
      console.error('Error saving MCQ response:', insertError);
      return Response.json({ error: 'Failed to record response' }, { status: 500 });
    }

    return Response.json({
      isCorrect,
      explanation: question.explanation || 'No explanation available',
    });
  } catch (error: any) {
    console.error('API submit MCQ error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
