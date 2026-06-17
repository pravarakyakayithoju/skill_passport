import { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { supabaseAdmin } from '@/lib/supabase/server';
import { generateQuestions } from '@/lib/question-generator';
import { MOCK, mockMemoryDb } from '@/lib/mock';

export const maxDuration = 300; // 5-minute timeout headroom for generation on Vercel Fluid Compute

export async function POST(req: NextRequest) {
  try {
    const {
      candidate_name,
      primary_skill,
      extracted_skills,
      tempId,
      file_url,
      parsed_data,
      raw_text,
    } = await req.json();

    if (MOCK) {
      const assessmentId = 'mock-assess-' + Math.random().toString(36).substring(7);
      
      // Store in memory mock DB
      mockMemoryDb.assessments.set(assessmentId, {
        id: assessmentId,
        candidate_name: candidate_name || 'Anonymous Candidate',
        primary_skill: (primary_skill || 'javascript').toLowerCase(),
        extracted_skills: extracted_skills || [],
        status: 'generating',
        created_at: new Date().toISOString()
      });

      mockMemoryDb.resumes.set(assessmentId, {
        assessment_id: assessmentId,
        file_url: file_url || `resumes/mock/${tempId}/resume.pdf`,
        parsed_data: parsed_data || { full_name: candidate_name, skills: extracted_skills, primary_skill },
        extracted_skills: extracted_skills || [],
      });

      // Run background generation in memory
      waitUntil(
        generateQuestions(assessmentId, primary_skill, extracted_skills)
          .then(() => {
            const current = mockMemoryDb.assessments.get(assessmentId);
            if (current) {
              current.status = 'in_progress';
              current.started_at = new Date().toISOString();
            }
          })
          .catch((err) => {
            console.error('Mock generation failed:', err);
            const current = mockMemoryDb.assessments.get(assessmentId);
            if (current) {
              current.status = 'failed';
              current.error_message = err.message || String(err);
            }
          })
      );

      return Response.json({ ok: true, assessmentId }, { status: 202 });
    }

    // 1. Create assessments entry (status: generating)
    const { data: assessmentData, error: assessmentError } = await supabaseAdmin
      .from('assessments')
      .insert({
        candidate_name: candidate_name || 'Anonymous Candidate',
        primary_skill: (primary_skill || 'javascript').toLowerCase(),
        extracted_skills: extracted_skills || [],
        status: 'generating',
      })
      .select('id')
      .single();

    if (assessmentError) {
      console.error('Error inserting assessment:', assessmentError);
      return Response.json({ error: `Failed to create assessment: ${assessmentError.message}` }, { status: 500 });
    }

    const assessmentId = assessmentData.id;

    // 2. Create resumes entry associated with the assessment ID
    const { error: resumeError } = await supabaseAdmin
      .from('resumes')
      .insert({
        assessment_id: assessmentId,
        file_url: file_url || `resumes/${tempId}/resume.pdf`,
        raw_text: raw_text || 'Canned or text-free resume parsing',
        parsed_data: parsed_data || { full_name: candidate_name, skills: extracted_skills, primary_skill },
        extracted_skills: extracted_skills || [],
      });

    if (resumeError) {
      console.error('Error inserting resume:', resumeError);
      // Clean up assessment row if resume fails
      await supabaseAdmin.from('assessments').delete().eq('id', assessmentId);
      return Response.json({ error: `Failed to save resume record: ${resumeError.message}` }, { status: 500 });
    }

    // 3. Trigger heavy AI generation in the background
    waitUntil(
      generateQuestions(assessmentId, primary_skill, extracted_skills)
        .then(async () => {
          // Success: update status to in_progress
          await supabaseAdmin
            .from('assessments')
            .update({
              status: 'in_progress',
              started_at: new Date().toISOString(),
            })
            .eq('id', assessmentId);
        })
        .catch(async (err) => {
          console.error(`Generation pipeline failed for assessment ${assessmentId}:`, err);
          await supabaseAdmin
            .from('assessments')
            .update({
              status: 'failed',
              error_message: err.message || String(err),
            })
            .eq('id', assessmentId);
        })
    );

    // 4. Return immediately to the client
    return Response.json({ ok: true, assessmentId }, { status: 202 });
  } catch (error: any) {
    console.error('API begin assessment error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
