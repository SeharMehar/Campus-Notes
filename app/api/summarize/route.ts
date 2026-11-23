import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  AiConfigError,
  AiEmptyResponseError,
  SUMMARY_VERSION,
  createFallbackSummary,
  extractTakeaways,
  fallbackToMarkdown,
  isCompleteSummary,
  streamSummary,
} from '@/lib/ai';

export const maxDuration = 60;


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


function textResponse(body: BodyInit, source: 'ai' | 'cache' | 'fallback', notice?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Summary-Source': source,
  };
  if (notice) headers['X-Summary-Notice'] = notice;
  return new Response(body, {
    headers,
  });
}

function summaryFailureNotice(error: unknown): string {
  if (error instanceof AiConfigError) return 'AI summaries are not configured. An administrator must add a valid server-side provider key.';
  if (error instanceof AiEmptyResponseError) return 'The AI provider returned no summary text. Check the provider model and try again.';
  const status = error instanceof Error ? error.message.match(/\((\d{3})\)/)?.[1] : undefined;
  if (status === '401' || status === '403') return 'The AI provider rejected its API key. An administrator must replace the server-side key before AI summaries can work.';
  if (status === '429') return 'The AI provider is busy or out of quota. This automatic summary is shown until service is available.';
  if (status === '400' || status === '404') return 'The AI model could not be reached. An administrator should check the model configuration.';
  if (status === '503') return 'The AI provider is temporarily unavailable. Please wait a moment and regenerate the summary.';
  if (error instanceof Error && error.message.includes('(network)')) return 'The AI provider could not be reached. Please check the connection and regenerate the summary.';
  return 'The AI service did not respond, so this is a quick automatic summary.';
}

function fallbackResponse(moduleTitle: string, content: string, notice?: string) {
  return textResponse(fallbackToMarkdown(createFallbackSummary({ moduleTitle, content })), 'fallback', notice);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const moduleId = typeof body?.moduleId === 'string' ? body.moduleId.trim() : '';
    const regenerate = body?.regenerate === true;

    if (!moduleId) return NextResponse.json({ error: 'moduleId is required.' }, { status: 400 });

    
    const { data: mod, error: modError } = await supabaseAdmin
      .from('modules')
      .select('id, title, content, course_id')
      .eq('id', moduleId)
      .maybeSingle();

    if (modError) {
      console.error('Could not read module:', modError.message);
      return NextResponse.json({ error: 'Unable to load this module right now.' }, { status: 500 });
    }
    if (!mod) return NextResponse.json({ error: 'This module could not be found.' }, { status: 404 });

    const content = typeof mod.content === 'string' ? mod.content.trim() : '';
    if (content.length < 50) return fallbackResponse(mod.title, content);

    const contentHash = createHash('sha256').update(`${SUMMARY_VERSION}:${content}`).digest('hex');

    
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

    
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return fallbackResponse(mod.title, content, 'The AI service is busy. This automatic summary is shown instead.');
    }

    
    const { data: course } = await supabaseAdmin.from('courses').select('title').eq('id', mod.course_id).maybeSingle();
    const generator = streamSummary({ courseTitle: course?.title, moduleTitle: mod.title, content });

    
    let first: IteratorResult<string>;
    try {
      first = await generator.next();
    } catch (aiError) {
      if (aiError instanceof AiConfigError) console.warn(aiError.message);
      else console.error('Summary generation failed:', aiError);
      return fallbackResponse(mod.title, content, summaryFailureNotice(aiError));
    }
    if (first.done || !first.value) {
      const notice = summaryFailureNotice(new AiEmptyResponseError('AI summary'));
      return fallbackResponse(mod.title, content, notice);
    }

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
    return NextResponse.json({ error: 'Unable to generate a summary right now.' }, { status: 500 });
  }
}
