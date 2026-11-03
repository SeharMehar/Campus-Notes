// app/api/summarize/route.ts
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { AiConfigError, SUMMARY_FALLBACK, createFallbackSummary, summarizeModule, type ModuleSummary } from '@/lib/ai';

export const maxDuration = 60;

// Very small in-memory rate limit so that the open (no-login) site cannot burn the API key.
const WINDOW_MS = 60_000;
const MAX_CALLS_PER_WINDOW = 12;
const calls = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (calls.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_CALLS_PER_WINDOW) {
    calls.set(ip, recent);
    return true;
  }
  recent.push(now);
  calls.set(ip, recent);
  return false;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const moduleId = typeof body?.moduleId === 'string' ? body.moduleId.trim() : '';

    if (!moduleId) {
      return NextResponse.json({ error: 'moduleId is required.' }, { status: 400 });
    }

    // The text is always read from the database, never trusted from the browser.
    const { data: mod, error: modError } = await supabaseAdmin
      .from('modules')
      .select('id, title, content, course_id')
      .eq('id', moduleId)
      .maybeSingle();

    if (modError) {
      console.error('Could not read module:', modError.message);
      const fallback = createFallbackSummary({ moduleTitle: 'This module', content: '' });
      return NextResponse.json({ ...fallback, cached: false, fallback: true });
    }
    if (!mod) {
      const fallback = createFallbackSummary({ moduleTitle: 'This module', content: '' });
      return NextResponse.json({ ...fallback, cached: false, fallback: true });
    }

    const content = typeof mod.content === 'string' ? mod.content.trim() : '';
    if (content.length < 50) {
      const result = createFallbackSummary({ moduleTitle: mod.title, content });
      return NextResponse.json({ ...result, cached: false, fallback: true });
    }

    const contentHash = createHash('sha256').update(content).digest('hex');

    // 1. Cache lookup (table ai_summaries, unique on module_id + content_hash). Best effort only.
    try {
      const { data: cached } = await supabaseAdmin
        .from('ai_summaries')
        .select('summary, key_takeaways')
        .eq('module_id', mod.id)
        .eq('content_hash', contentHash)
        .maybeSingle();

      if (cached && typeof cached.summary === 'string' && Array.isArray(cached.key_takeaways) && cached.key_takeaways.length >= 4) {
        return NextResponse.json({
          summary: cached.summary,
          keyTakeaways: cached.key_takeaways.slice(0, 4),
          cached: true,
        });
      }
    } catch (cacheError) {
      console.warn('Summary cache read skipped:', cacheError);
    }

    // 2. Rate limit only the calls that really cost money.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      const fallback = createFallbackSummary({ moduleTitle: mod.title, content });
      return NextResponse.json({ ...fallback, cached: false, fallback: true });
    }

    // 3. Ask the AI.
    const { data: course } = await supabaseAdmin.from('courses').select('title').eq('id', mod.course_id).maybeSingle();

    let result: ModuleSummary;
    try {
      result = await summarizeModule({
        courseTitle: course?.title,
        moduleTitle: mod.title,
        content,
      });
    } catch (aiError) {
      if (aiError instanceof AiConfigError) {
        console.warn(aiError.message);
      } else {
        console.error('Summary generation failed:', aiError);
      }
      result = createFallbackSummary({ moduleTitle: mod.title, content });
      return NextResponse.json({ ...result, cached: false, fallback: true });
    }

    // 4. Save to cache (best effort: a cache problem must never break the summary itself).
    try {
      const { error: saveError } = await supabaseAdmin.from('ai_summaries').upsert(
        {
          module_id: mod.id,
          content_hash: contentHash,
          summary: result.summary,
          key_takeaways: result.keyTakeaways,
        },
        { onConflict: 'module_id,content_hash' }
      );
      if (saveError) console.warn('Summary cache write skipped:', saveError.message);
    } catch (saveException) {
      console.warn('Summary cache write skipped:', saveException);
    }

    return NextResponse.json({ ...result, cached: false });
  } catch (error) {
    console.error('Summarize route error:', error);
    const fallback = createFallbackSummary({ moduleTitle: 'This module', content: '' });
    return NextResponse.json({ ...fallback, cached: false, fallback: true });
  }
}
