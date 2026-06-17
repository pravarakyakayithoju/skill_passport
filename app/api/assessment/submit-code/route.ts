import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { MOCK, mockMemoryDb } from '@/lib/mock';

export async function POST(req: NextRequest) {
  try {
    const { assessmentId, code, language } = await req.json();

    if (!assessmentId) {
      return Response.json({ error: 'Missing assessment ID' }, { status: 400 });
    }

    if (MOCK) {
      mockMemoryDb.codeSubmissions.set(assessmentId, {
        assessment_id: assessmentId,
        code: code || '',
        language: language || 'javascript',
        created_at: new Date().toISOString()
      });
      return Response.json({ ok: true });
    }

    // Check if a submission already exists
    const { data: existingSub, error: fetchError } = await supabaseAdmin
      .from('code_submissions')
      .select('id')
      .eq('assessment_id', assessmentId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching code submission:', fetchError);
    }

    if (existingSub) {
      // Update existing record
      const { error: updateError } = await supabaseAdmin
        .from('code_submissions')
        .update({
          code: code || '',
          language: language || 'javascript',
        })
        .eq('id', existingSub.id);

      if (updateError) throw updateError;
    } else {
      // Insert new record
      const { error: insertError } = await supabaseAdmin
        .from('code_submissions')
        .insert({
          assessment_id: assessmentId,
          code: code || '',
          language: language || 'javascript',
        });

      if (insertError) throw insertError;
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    console.error('API submit code error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
