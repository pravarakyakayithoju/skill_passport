import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { MOCK, mockMemoryDb } from '@/lib/mock';

export async function POST(req: NextRequest) {
  try {
    const { assessmentId, events, pasteCount, tabSwitchCount, anomalyFlags } = await req.json();

    if (!assessmentId) {
      return Response.json({ error: 'Missing assessment ID' }, { status: 400 });
    }

    if (MOCK) {
      mockMemoryDb.keystrokeLogs.set(assessmentId, {
        assessment_id: assessmentId,
        events: events || [],
        paste_count: pasteCount || 0,
        tab_switch_count: tabSwitchCount || 0,
        anomaly_flags: anomalyFlags || [],
      });
      return Response.json({ ok: true });
    }

    // Check if logs already exist for this assessment
    const { data: existingLog, error: fetchError } = await supabaseAdmin
      .from('keystroke_logs')
      .select('id')
      .eq('assessment_id', assessmentId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing keystroke logs:', fetchError);
    }

    if (existingLog) {
      // Update existing record
      const { error: updateError } = await supabaseAdmin
        .from('keystroke_logs')
        .update({
          events: events || [],
          paste_count: pasteCount || 0,
          tab_switch_count: tabSwitchCount || 0,
          anomaly_flags: anomalyFlags || [],
        })
        .eq('id', existingLog.id);

      if (updateError) throw updateError;
    } else {
      // Insert new record
      const { error: insertError } = await supabaseAdmin
        .from('keystroke_logs')
        .insert({
          assessment_id: assessmentId,
          events: events || [],
          paste_count: pasteCount || 0,
          tab_switch_count: tabSwitchCount || 0,
          anomaly_flags: anomalyFlags || [],
        });

      if (insertError) throw insertError;
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    console.error('API keystrokes error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
