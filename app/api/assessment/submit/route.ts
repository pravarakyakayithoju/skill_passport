import { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { supabaseAdmin } from '@/lib/supabase/server';
import { runPipeline } from '@/lib/pipeline';
import { MOCK, mockMemoryDb } from '@/lib/mock';

export const maxDuration = 300; // 5 minutes execution limit on Vercel Fluid Compute for pipeline runs

export async function POST(req: NextRequest) {
  try {
    const { assessmentId } = await req.json();

    if (!assessmentId) {
      return Response.json({ error: 'Missing assessment ID' }, { status: 400 });
    }

    if (MOCK) {
      const current = mockMemoryDb.assessments.get(assessmentId);
      if (current) {
        current.status = 'processing';
        current.submitted_at = new Date().toISOString();
      }

      waitUntil(
        runPipeline(assessmentId)
          .then(() => {
            const curr = mockMemoryDb.assessments.get(assessmentId);
            if (curr) curr.status = 'completed';
          })
          .catch((err) => {
            console.error('Mock submit failed:', err);
            const curr = mockMemoryDb.assessments.get(assessmentId);
            if (curr) {
              curr.status = 'failed';
              curr.error_message = err.message || String(err);
            }
          })
      );

      return Response.json({ ok: true, assessmentId }, { status: 202 });
    }

    // 1. Flip status to 'processing' and save submission time
    const { error: updateStatusError } = await supabaseAdmin
      .from('assessments')
      .update({
        status: 'processing',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', assessmentId);

    if (updateStatusError) {
      console.error('Error initiating submission status:', updateStatusError);
      return Response.json({ error: 'Failed to update assessment status' }, { status: 500 });
    }

    // 2. Launch background pipeline execution using Vercel functions waitUntil
    waitUntil(
      runPipeline(assessmentId)
        .then(async () => {
          // Flip status to completed when pipeline succeeds
          await supabaseAdmin
            .from('assessments')
            .update({ status: 'completed' })
            .eq('id', assessmentId);
        })
        .catch(async (err: any) => {
          console.error(`Pipeline scoring failed for assessment ${assessmentId}:`, err);
          await supabaseAdmin
            .from('assessments')
            .update({
              status: 'failed',
              error_message: err.message || String(err),
            })
            .eq('id', assessmentId);
        })
    );

    // 3. Return 202 status code immediately
    return Response.json({ ok: true, assessmentId }, { status: 202 });
  } catch (error: any) {
    console.error('API submit assessment error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
