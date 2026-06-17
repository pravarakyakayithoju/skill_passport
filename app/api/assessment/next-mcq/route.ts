import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { MOCK, mockMemoryDb } from '@/lib/mock';

export async function POST(req: NextRequest) {
  try {
    const { assessmentId, currentDifficulty, lastWasCorrect, answeredIds } = await req.json();

    if (!assessmentId) {
      return Response.json({ error: 'Missing assessment ID' }, { status: 400 });
    }

    const answeredList: string[] = answeredIds || [];

    // Stop after 5 questions answered
    if (answeredList.length >= 5) {
      return Response.json({ isFinished: true, question: null });
    }

    let allQuestions = [];

    if (MOCK) {
      allQuestions = mockMemoryDb.mcqQuestions.get(assessmentId) || [];
      if (allQuestions.length === 0) {
        // Fallback to pool if none generated yet
        allQuestions = mockMemoryDb.mcqQuestions.get('mock') || [];
      }
    } else {
      // Retrieve all 10 pre-generated MCQs for this assessment
      const { data, error: fetchError } = await supabaseAdmin
        .from('mcq_questions')
        .select('id, skill, difficulty, question, options')
        .eq('assessment_id', assessmentId);

      if (fetchError || !data || data.length === 0) {
        console.error('Error fetching MCQ questions:', fetchError);
        return Response.json({ error: 'Failed to retrieve MCQ question pool' }, { status: 500 });
      }
      allQuestions = data;
    }

    // Filter out already answered questions
    const remainingQuestions = allQuestions.filter((q) => !answeredList.includes(q.id));

    if (remainingQuestions.length === 0) {
      return Response.json({ isFinished: true, question: null });
    }

    // Determine target difficulty level
    let targetDifficulty = 2; // Default start level
    if (answeredList.length > 0) {
      const d = currentDifficulty !== undefined ? Number(currentDifficulty) : 2;
      targetDifficulty = lastWasCorrect ? Math.min(5, d + 1) : Math.max(1, d - 1);
    }

    // Find a question at target difficulty
    let selectedQuestion = remainingQuestions.find((q) => q.difficulty === targetDifficulty);

    // If none exists, widen search to nearest available difficulty
    if (!selectedQuestion) {
      let delta = 1;
      while (delta <= 4) {
        // Check target + delta
        selectedQuestion = remainingQuestions.find((q) => q.difficulty === targetDifficulty + delta);
        if (selectedQuestion) break;

        // Check target - delta
        selectedQuestion = remainingQuestions.find((q) => q.difficulty === targetDifficulty - delta);
        if (selectedQuestion) break;

        delta++;
      }
    }

    // Fallback: pick the first available question
    if (!selectedQuestion && remainingQuestions.length > 0) {
      selectedQuestion = remainingQuestions[0];
    }

    if (!selectedQuestion) {
      return Response.json({ isFinished: true, question: null });
    }

    return Response.json({
      isFinished: false,
      question: {
        id: selectedQuestion.id,
        skill: selectedQuestion.skill,
        difficulty: selectedQuestion.difficulty,
        question: selectedQuestion.question,
        options: selectedQuestion.options,
      },
    });
  } catch (error: any) {
    console.error('API next MCQ error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
