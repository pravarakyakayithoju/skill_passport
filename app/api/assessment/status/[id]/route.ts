export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { MOCK, mockMemoryDb } from '@/lib/mock';

function parseCodingQuestion(questionData: any) {
  if (!questionData) return null;
  
  let isMulti = false;
  let starterCodes = { javascript: '', python: '', java: '', cpp: '', c: '', csharp: '' };
  let visibleTests = { javascript: [], python: [], java: [], cpp: [], c: [], csharp: [] };
  
  const starterCodeStr = questionData.starter_code || '';
  if (typeof starterCodeStr === 'string' && starterCodeStr.trim().startsWith('{')) {
    try {
      starterCodes = JSON.parse(starterCodeStr);
      const vis = questionData.visible_tests;
      visibleTests = typeof vis === 'string' ? JSON.parse(vis) : vis;
      isMulti = true;
    } catch (e) {
      console.error('Failed to parse multi-language JSON fields:', e);
    }
  }

  return {
    title: questionData.title,
    description: questionData.description,
    isMulti,
    language: questionData.language,
    starter_code: questionData.starter_code,
    visible_tests: questionData.visible_tests,
    starterCodes,
    visibleTests,
  };
}

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
      let codeSubmission = null;
      if (assessment.status === 'in_progress' || assessment.status === 'completed' || assessment.status === 'processing') {
        const questionData = mockMemoryDb.codingQuestions.get(id);
        if (questionData) {
          codingQuestion = parseCodingQuestion(questionData);
        }
        codeSubmission = mockMemoryDb.codeSubmissions.get(id) || null;
      }

      return Response.json({
        status: assessment.status,
        error_message: assessment.error_message,
        codingQuestion,
        codeSubmission,
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
    let codeSubmission = null;

    if (assessment.status === 'in_progress' || assessment.status === 'completed' || assessment.status === 'processing') {
      const { data: questionData, error: questionError } = await supabaseAdmin
        .from('coding_questions')
        .select('language, title, description, starter_code, visible_tests')
        .eq('assessment_id', id)
        .maybeSingle();

      if (questionError) {
        console.error('Error fetching associated coding question:', questionError);
      } else if (questionData) {
        codingQuestion = parseCodingQuestion(questionData);
      }

      const { data: submissionData } = await supabaseAdmin
        .from('code_submissions')
        .select('code, language')
        .eq('assessment_id', id)
        .maybeSingle();
      
      codeSubmission = submissionData || null;
    }

    return Response.json({
      status: assessment.status,
      error_message: assessment.error_message,
      codingQuestion,
      codeSubmission,
    });
  } catch (error: any) {
    console.error('API assessment status error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
