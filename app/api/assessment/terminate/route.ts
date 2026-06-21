import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { MOCK, mockMemoryDb } from '@/lib/mock';

export async function POST(req: NextRequest) {
  try {
    const { assessmentId, reason } = await req.json();

    if (!assessmentId) {
      return Response.json({ error: 'Missing assessment ID' }, { status: 400 });
    }

    const statusMessage = reason || 'Assessment terminated due to proctoring violation';

    if (MOCK) {
      const assessment = mockMemoryDb.assessments.get(assessmentId);
      if (assessment) {
        assessment.status = 'failed';
        assessment.error_message = statusMessage;
      }
      return Response.json({ ok: true });
    }

    const { error } = await supabaseAdmin
      .from('assessments')
      .update({
        status: 'failed',
        error_message: statusMessage,
      })
      .eq('id', assessmentId);

    if (error) {
      console.error('Error terminating assessment:', error);
      return Response.json({ error: `Failed to terminate assessment: ${error.message}` }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    console.error('API assessment terminate error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
