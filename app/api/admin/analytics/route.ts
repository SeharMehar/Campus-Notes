import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSessionFromRequest } from '@/lib/session';


interface EventRow {
  created_at: string;
  visitor_id: string;
  event: string;
  course_id: string | null;
  module_id: string | null;
  value: number | null;
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin login required.' }, { status: 401 });
  }

  const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get('days')) || 14));
  const since = new Date(Date.now() - days * 86400000);
  since.setUTCHours(0, 0, 0, 0);

  
  const [coursesRes, modulesRes, mcqsRes] = await Promise.all([
    supabaseAdmin.from('courses').select('id, title, code'),
    supabaseAdmin.from('modules').select('id, title, course_id'),
    supabaseAdmin.from('mcqs').select('id', { count: 'exact', head: true }),
  ]);
  const courses = coursesRes.data ?? [];
  const modules = modulesRes.data ?? [];

  const library = { courses: courses.length, modules: modules.length, mcqs: mcqsRes.count ?? 0 };

  const { data, error } = await supabaseAdmin
    .from('analytics_events')
    .select('created_at, visitor_id, event, course_id, module_id, value')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(30000);

  if (error) {
    
    const setupNeeded = error.code === '42P01' || /does not exist|schema cache/i.test(error.message);
    return NextResponse.json({ setupNeeded, library, error: setupNeeded ? null : error.message }, { status: setupNeeded ? 200 : 500 });
  }

  const events = (data ?? []) as EventRow[];
  const moduleName = new Map(modules.map((m) => [String(m.id), m.title as string]));
  const moduleCourse = new Map(modules.map((m) => [String(m.id), String(m.course_id)]));
  const courseName = new Map(courses.map((c) => [String(c.id), (c.title as string) || String(c.code)]));

  const count = (name: string) => events.filter((e) => e.event === name).length;
  const visitors = new Set(events.map((e) => e.visitor_id));

  
  const daysByVisitor = new Map<string, Set<string>>();
  for (const e of events) {
    const set = daysByVisitor.get(e.visitor_id) ?? new Set<string>();
    set.add(e.created_at.slice(0, 10));
    daysByVisitor.set(e.visitor_id, set);
  }
  const returning = [...daysByVisitor.values()].filter((s) => s.size >= 2).length;

  
  const daily: { date: string; visitors: number; views: number; quizzes: number; summaries: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = dayKey(d);
    const dayEvents = events.filter((e) => e.created_at.slice(0, 10) === key);
    daily.push({
      date: key,
      visitors: new Set(dayEvents.map((e) => e.visitor_id)).size,
      views: dayEvents.filter((e) => e.event === 'module_view' || e.event === 'page_view').length,
      quizzes: dayEvents.filter((e) => e.event === 'quiz_completed').length,
      summaries: dayEvents.filter((e) => e.event === 'summary_generated').length,
    });
  }

  
  const perModule = new Map<string, { views: number; quizzes: number; scoreSum: number; completions: number; summaries: number }>();
  const touch = (id: string) => {
    const cur = perModule.get(id) ?? { views: 0, quizzes: 0, scoreSum: 0, completions: 0, summaries: 0 };
    perModule.set(id, cur);
    return cur;
  };
  for (const e of events) {
    if (!e.module_id) continue;
    const m = touch(e.module_id);
    if (e.event === 'module_view') m.views++;
    if (e.event === 'quiz_completed') { m.quizzes++; m.scoreSum += e.value ?? 0; }
    if (e.event === 'module_completed') m.completions++;
    if (e.event === 'summary_generated') m.summaries++;
  }
  const moduleRows = [...perModule.entries()].map(([id, m]) => ({
    id,
    title: moduleName.get(id) ?? `Module ${id}`,
    course: courseName.get(moduleCourse.get(id) ?? '') ?? '',
    ...m,
    avgScore: m.quizzes ? Math.round(m.scoreSum / m.quizzes) : null,
  }));

  const topModules = [...moduleRows].sort((a, b) => b.views - a.views).slice(0, 8);
  const weakestModules = moduleRows.filter((m) => m.avgScore !== null && m.quizzes >= 1).sort((a, b) => (a.avgScore! - b.avgScore!)).slice(0, 5);

  
  const perCourse = new Map<string, number>();
  for (const e of events) {
    if (e.event !== 'module_view') continue;
    const cid = e.course_id ?? moduleCourse.get(e.module_id ?? '') ?? '';
    if (cid) perCourse.set(cid, (perCourse.get(cid) ?? 0) + 1);
  }
  const topCourses = [...perCourse.entries()]
    .map(([id, views]) => ({ id, title: courseName.get(id) ?? `Course ${id}`, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  
  const scores = events.filter((e) => e.event === 'quiz_completed' && e.value !== null).map((e) => e.value as number);
  const buckets = [
    { label: '0–39%', count: scores.filter((s) => s < 40).length },
    { label: '40–59%', count: scores.filter((s) => s >= 40 && s < 60).length },
    { label: '60–79%', count: scores.filter((s) => s >= 60 && s < 80).length },
    { label: '80–100%', count: scores.filter((s) => s >= 80).length },
  ];
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const passRate = scores.length ? Math.round((scores.filter((s) => s >= 50).length / scores.length) * 100) : null;

  const recent = events.slice(0, 12).map((e) => ({
    at: e.created_at,
    event: e.event,
    module: e.module_id ? moduleName.get(e.module_id) ?? null : null,
    value: e.value,
  }));

  return NextResponse.json({
    setupNeeded: false,
    days,
    library,
    totals: {
      visitors: visitors.size,
      returningVisitors: returning,
      pageViews: count('page_view'),
      moduleViews: count('module_view'),
      summaries: count('summary_generated'),
      quizzes: count('quiz_completed'),
      completions: count('module_completed'),
      tutorMessages: count('tutor_message'),
      avgScore,
      passRate,
    },
    daily,
    topModules,
    topCourses,
    weakestModules,
    scoreBuckets: buckets,
    recent,
  });
}
