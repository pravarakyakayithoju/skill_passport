import { NextRequest } from 'next/server';
import { supabaseAdmin, ensureBucketExists } from '@/lib/supabase/server';
import { transcribeAudio } from '@/lib/whisper';
import { MOCK, MOCK_WHISPER_TRANSCRIPT, mockMemoryDb } from '@/lib/mock';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const assessmentId = formData.get('assessmentId') as string;
    const isMockFlag = formData.get('is_mock') as string === 'true';
    const file = formData.get('file') as File | null;

    if (!assessmentId) {
      return Response.json({ error: 'Missing assessment ID' }, { status: 400 });
    }

    if (MOCK || isMockFlag || !file) {
      // Offline mock insert
      const mockFilePath = `videos/${assessmentId}/explanation.webm`;

      mockMemoryDb.explanationVideos.set(assessmentId, {
        assessment_id: assessmentId,
        video_url: mockFilePath,
        transcript: MOCK_WHISPER_TRANSCRIPT,
        created_at: new Date().toISOString()
      });

      return Response.json({ ok: true });
    }

    // Real Mode Flow:
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = `${assessmentId}/${file.name || 'explanation.webm'}`;

    await ensureBucketExists('videos');

    // 1. Upload video WebM binary to Supabase Storage videos bucket
    const { error: uploadError } = await supabaseAdmin.storage
      .from('videos')
      .upload(filePath, buffer, {
        contentType: file.type || 'video/webm',
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase video upload error:', uploadError);
      return Response.json({ error: `Failed to upload explanation video: ${uploadError.message}` }, { status: 500 });
    }

    // 2. Transcribe voice in WebM via OpenAI Whisper
    const transcript = await transcribeAudio(file);

    // 3. Write record to explanation_videos database table
    const { data: existingRecord } = await supabaseAdmin
      .from('explanation_videos')
      .select('id')
      .eq('assessment_id', assessmentId)
      .maybeSingle();

    if (existingRecord) {
      const { error: dbError } = await supabaseAdmin
        .from('explanation_videos')
        .update({
          video_url: filePath,
          transcript,
        })
        .eq('id', existingRecord.id);

      if (dbError) throw dbError;
    } else {
      const { error: dbError } = await supabaseAdmin
        .from('explanation_videos')
        .insert({
          assessment_id: assessmentId,
          video_url: filePath,
          transcript,
        });

      if (dbError) throw dbError;
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    console.error('API submit video error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
