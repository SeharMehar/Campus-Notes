// lib/track.ts  (browser only)
// Sends anonymous usage events to /api/track. No names, emails or personal data are collected;
// a random visitor id is stored in localStorage so we can count unique learners.

export type TrackEvent =
  | 'page_view'
  | 'module_view'
  | 'summary_generated'
  | 'quiz_completed'
  | 'module_completed'
  | 'tutor_message';

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem('cn_visitor');
    if (!id) {
      id = (crypto.randomUUID?.() ?? `v-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem('cn_visitor', id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
}

export function track(
  event: TrackEvent,
  data: { courseId?: string | number | null; moduleId?: string | number | null; value?: number; meta?: Record<string, unknown> } = {}
) {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({
      visitorId: getVisitorId(),
      event,
      courseId: data.courseId != null ? String(data.courseId) : null,
      moduleId: data.moduleId != null ? String(data.moduleId) : null,
      value: data.value ?? null,
      meta: data.meta ?? {},
    });
    fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {
    /* analytics must never break the app */
  }
}
