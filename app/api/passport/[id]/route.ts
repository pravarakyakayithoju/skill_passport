export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { MOCK, mockMemoryDb, MOCK_RESUME } from '@/lib/mock';

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
      const passport = mockMemoryDb.skillPassports.get(id);
      const assessment = mockMemoryDb.assessments.get(id) || {
        candidate_name: 'Mock Candidate',
        primary_skill: 'javascript',
        status: 'completed'
      };

      const signedResumeUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
      const signedVideoUrl = passport?.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

      if (!passport) {
        // Fallback placeholder card if they directly navigated without running the pipeline
        const fallbackPassport = {
          assessment_id: id,
          code_score: 90,
          mcq_score: 80,
          explanation_score: 85,
          resume_score: 85,
          final_score: 86.5,
          base_confidence: 70,
          confidence_penalty: 0,
          final_confidence: 70,
          verified_skills: ['javascript', 'react', 'nodejs'],
          skill_level_map: { javascript: 'mid', react: 'mid', nodejs: 'mid' },
          code_snippet: 'function twoSum() {}',
          video_url: signedVideoUrl,
          keystroke_timeline: [],
          anomaly_flags: [],
        };
        return Response.json({
          passport: fallbackPassport,
          assessment,
          resumeUrl: signedResumeUrl
        });
      }

      return Response.json({
        passport: {
          ...passport,
          video_url: signedVideoUrl
        },
        assessment,
        resumeUrl: signedResumeUrl
      });
    }

    // 1. Fetch the Skill Passport record
    const { data: passport, error: passportError } = await supabaseAdmin
      .from('skill_passports')
      .select('*')
      .eq('assessment_id', id)
      .maybeSingle();

    if (passportError || !passport) {
      console.error('Error fetching passport:', passportError);
      return Response.json({ error: 'Skill passport not generated or not found' }, { status: 404 });
    }

    // 2. Fetch candidate metadata from assessments table
    const { data: assessment, error: assessmentError } = await supabaseAdmin
      .from('assessments')
      .select('candidate_name, primary_skill, status')
      .eq('id', id)
      .single();

    if (assessmentError) {
      console.error('Error fetching assessment info:', assessmentError);
    }

    // 3. Fetch resume record to generate signed URL
    const { data: resume, error: resumeError } = await supabaseAdmin
      .from('resumes')
      .select('file_url')
      .eq('assessment_id', id)
      .maybeSingle();

    let signedResumeUrl = '';
    let signedVideoUrl = '';

    if (MOCK) {
      signedResumeUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'; // Public sample PDF
      signedVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'; // Public sample mp4
    } else {
      // Generate secure signed URLs with 1-hour validity for private buckets
      if (resume && resume.file_url) {
        const { data: resumeSign } = await supabaseAdmin.storage
          .from('resumes')
          .createSignedUrl(resume.file_url, 3600);
        if (resumeSign) signedResumeUrl = resumeSign.signedUrl;
      }

      if (passport.video_url) {
        const { data: videoSign } = await supabaseAdmin.storage
          .from('videos')
          .createSignedUrl(passport.video_url, 3600);
        if (videoSign) signedVideoUrl = videoSign.signedUrl;
      }
    }

    return Response.json({
      passport: {
        ...passport,
        video_url: signedVideoUrl,
      },
      assessment: assessment || { candidate_name: 'Anonymous Candidate', primary_skill: 'javascript' },
      resumeUrl: signedResumeUrl,
    });
  } catch (error: any) {
    console.error('API get passport error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
