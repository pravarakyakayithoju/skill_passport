export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { MOCK, mockMemoryDb } from '@/lib/mock';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id) {
      return Response.json({ error: 'Missing assessment ID' }, { status: 400 });
    }

    if (MOCK) {
      const assessment = mockMemoryDb.assessments.get(id);
      if (!assessment) {
        return Response.json({ error: 'Mock assessment not found' }, { status: 404 });
      }

      let codingQuestion = null;
      if (assessment.status === 'in_progress') {
        const questionData = mockMemoryDb.codingQuestions.get(id);
        if (questionData) {
          codingQuestion = {
            language: questionData.language,
            title: questionData.title,
            description: questionData.description,
            starter_code: questionData.starter_code,
            visible_tests: questionData.visible_tests,
          };
        }
      }

      return Response.json({
        status: assessment.status,
        error_message: assessment.error_message,
        codingQuestion,
      });
    }

    const { data: assessment, error: assessmentError } = await supabaseAdmin
      .from('assessments')
      .select('status, error_message')
      .eq('id', id)
      .single();

    if (assessmentError) {
      console.error('Error fetching assessment status:', assessmentError);
      return Response.json({ error: `Failed to find assessment: ${assessmentError.message}` }, { status: 404 });
    }

    let codingQuestion = null;

    // If assessment is in progress, also retrieve the coding question details securely
    if (assessment.status === 'in_progress') {
      const { data: questionData, error: questionError } = await supabaseAdmin
        .from('coding_questions')
        .select('language, title, description, starter_code, visible_tests')
        .eq('assessment_id', id)
        .maybeSingle();

      if (questionError) {
        console.error('Error fetching associated coding question:', questionError);
      } else if (questionData) {
        codingQuestion = questionData;
      }
    }

    return Response.json({
      status: assessment.status,
      error_message: assessment.error_message,
      codingQuestion,
    });
  } catch (error: any) {
    console.error('API assessment status error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
