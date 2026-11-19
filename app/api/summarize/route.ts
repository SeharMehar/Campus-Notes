// app/api/summarize/route.ts
// Streams a ChatGPT/Gemini-style markdown summary for one module.
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  AiConfigError,
  SUMMARY_VERSION,
  createFallbackSummary,
  extractTakeaways,
  fallbackToMarkdown,
  isCompleteSummary,
  streamSummary,
} from '@/lib/ai';

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

/** Plain-text response. X-Summary-Source tells the UI where the text came from: ai | cache | fallback. */
function textResponse(body: BodyInit, source: 'ai' | 'cache' | 'fallback') {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Summary-Source': source,
    },
  });
}

function fallbackResponse(moduleTitle: string, content: string) {
  return textResponse(fallbackToMarkdown(createFallbackSummary({ moduleTitle, content })), 'fallback');
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const moduleId = typeof body?.moduleId === 'string' ? body.moduleId.trim() : '';
    const regenerate = body?.regenerate === true;

    if (!moduleId) return NextResponse.json({ error: 'moduleId is required.' }, { status: 400 });

    // The text is always read from the database, never trusted from the browser.
    const { data: mod, error: modError } = await supabaseAdmin
      .from('modules')
      .select('id, title, content, course_id')
      .eq('id', moduleId)
      .maybeSingle();

    if (modError || !mod) {
      if (modError) console.error('Could not read module:', modError.message);
      return fallbackResponse('This module', '');
    }

    const content = typeof mod.content === 'string' ? mod.content.trim() : '';
    if (content.length < 50) return fallbackResponse(mod.title, content);

    const contentHash = createHash('sha256').update(`${SUMMARY_VERSION}:${content}`).digest('hex');

    // 1. Cache lookup (best effort). "Regenerate" skips it.
    if (!regenerate) {
      try {
        const { data: cached } = await supabaseAdmin
          .from('ai_summaries')
          .select('summary')
          .eq('module_id', mod.id)
          .eq('content_hash', contentHash)
          .maybeSingle();
        if (cached && typeof cached.summary === 'string' && isCompleteSummary(cached.summary)) {
          return textResponse(cached.summary, 'cache');
        }
      } catch (cacheError) {
        console.warn('Summary cache read skipped:', cacheError);
      }
    }

    // 2. Rate limit only the calls that really cost money.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) return fallbackResponse(mod.title, content);

    // 3. Ask the AI and stream the answer to the browser.
    const { data: course } = await supabaseAdmin.from('courses').select('title').eq('id', mod.course_id).maybeSingle();
    const generator = streamSummary({ courseTitle: course?.title, moduleTitle: mod.title, content });

    // Wait for the first chunk so that an AI failure can still fall back cleanly (HTTP headers are not sent yet).
    let first: IteratorResult<string>;
    try {
      first = await generator.next();
    } catch (aiError) {
      if (aiError instanceof AiConfigError) console.warn(aiError.message);
      else console.error('Summary generation failed:', aiError);
      return fallbackResponse(mod.title, content);
    }
    if (first.done || !first.value) return fallbackResponse(mod.title, content);

    const encoder = new TextEncoder();
    let full = first.value;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(first.value as string));
          while (true) {
            const { done, value } = await generator.next();
            if (done) break;
            full += value;
            controller.enqueue(encoder.encode(value));
          }
        } catch (streamError) {
          console.error('Summary stream interrupted:', streamError);
        }

        // 4. Save to cache only when the summary is complete (best effort).
        if (isCompleteSummary(full)) {
          try {
            const { error: saveError } = await supabaseAdmin.from('ai_summaries').upsert(
              {
                module_id: mod.id,
                content_hash: contentHash,
                summary: full.trim(),
                key_takeaways: extractTakeaways(full).slice(0, 4),
              },
              { onConflict: 'module_id,content_hash' }
            );
            if (saveError) console.warn('Summary cache write skipped:', saveError.message);
          } catch (saveException) {
            console.warn('Summary cache write skipped:', saveException);
          }
        }
        controller.close();
      },
    });

    return textResponse(stream, 'ai');
  } catch (error) {
    console.error('Summarize route error:', error);
    return fallbackResponse('This module', '');
  }
}
