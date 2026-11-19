import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const ALLOWED = new Set([
  'page_view',
  'module_view',
  'summary_generated',
  'quiz_completed',
  'module_completed',
  'tutor_message',
]);

const str = (v: unknown, max = 80) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** Stores one anonymous usage event. Always answers 202 so tracking can never break the student UI. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const event = str(body?.event, 40);
    const visitorId = str(body?.visitorId, 80);
    if (!event || !visitorId || !ALLOWED.has(event)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const value = typeof body.value === 'number' && Number.isFinite(body.value) ? body.value : null;
    const meta = body.meta && typeof body.meta === 'object' && JSON.stringify(body.meta).length < 500 ? body.meta : {};

    const { error } = await supabaseAdmin.from('analytics_events').insert({
      visitor_id: visitorId,
      event,
      course_id: str(body.courseId),
      module_id: str(body.moduleId),
      value,
      meta,
    });
    if (error) console.warn('Analytics insert skipped:', error.message);
  } catch (err) {
    console.warn('Analytics error:', err);
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}
