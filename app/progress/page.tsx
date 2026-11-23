'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Flame, Trophy, Bookmark, Target, Award, Lock, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { AreaChart, Donut } from '@/components/Charts';
import {
  BADGES, Bookmark as BookmarkT, QuizRecord, Stats, computeXp, getBookmarks, getCompletedByCourse, getCounters,
  getLastVisit, getQuizHistory, getStreak, getStudyDays, LastVisit, markStudyDay,
} from '@/lib/progress';

interface CourseRow { id: string; title: string; code?: string; course_code?: string }

export default function ProgressPage() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [moduleCount, setModuleCount] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState<Record<string, string[]>>({});
  const [history, setHistory] = useState<QuizRecord[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkT[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [last, setLast] = useState<LastVisit | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'My Progress | CampusNotes';
    markStudyDay();
    (async () => {
      const [{ data: c }, { data: m }] = await Promise.all([
        supabase.from('courses').select('*'),
        supabase.from('modules').select('course_id'),
      ]);
      const list = ((c as CourseRow[]) ?? []).map((x) => ({ ...x, id: String(x.id) }));
      const counts: Record<string, number> = {};
      (m ?? []).forEach((row: { course_id: string | number }) => { counts[String(row.course_id)] = (counts[String(row.course_id)] || 0) + 1; });
      setCourses(list);
      setModuleCount(counts);
      setCompleted(getCompletedByCourse(list.map((x) => x.id)));
      setHistory(getQuizHistory());
      setBookmarks(getBookmarks());
      setDays(getStudyDays());
      setCounters(getCounters());
      setLast(getLastVisit());
      setNow(Date.now());
      setLoading(false);
    })();
  }, []);

  const streak = now === null ? { current: 0, best: 0 } : getStreak(days, now);
  const stats: Stats = useMemo(() => {
    const modulesDone = Object.values(completed).reduce((a, l) => a + l.length, 0);
    const coursesFinished = courses.filter((c) => (moduleCount[c.id] || 0) > 0 && (completed[c.id]?.length || 0) >= moduleCount[c.id]).length;
    return {
      modulesDone,
      quizzes: history.length,
      perfectQuizzes: history.filter((h) => h.score === 100).length,
      bestStreak: streak.best,
      summaries: counters.summaries || 0,
      tutor: counters.tutor || 0,
      coursesFinished,
    };
  }, [completed, courses, moduleCount, history, counters, streak.best]);

  const xp = computeXp(stats);
  const totalModules = Object.values(moduleCount).reduce((a, b) => a + b, 0);
  const overall = totalModules ? Math.round((stats.modulesDone / totalModules) * 100) : 0;
  const avgScore = history.length ? Math.round(history.reduce((a, h) => a + h.score, 0) / history.length) : null;
  const unlocked = BADGES.filter((b) => b.test(stats));

  
  const week = now === null ? [] : Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now - (13 - i) * 86400000).toISOString().slice(0, 10);
    return { d, on: days.includes(d) };
  });

  const circ = 2 * Math.PI * 54;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800">
      <SiteHeader />

      <div className="bg-gradient-to-r from-orange-50 via-white to-amber-50">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-600">Your learning journey</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">My Learning Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Your progress is saved on this device. No account needed.</p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-6 py-8">
        {last && (
          <Link href={`/course/${last.courseId}`} className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-orange-950 to-orange-800 p-5 text-white shadow-lg shadow-orange-950/10 transition hover:from-orange-900 hover:to-orange-700">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#f2dac7]">Continue where you left off</p>
              <p className="mt-1 text-lg font-bold">{last.title}</p>
              {last.courseTitle && <p className="text-sm text-slate-300">{last.courseTitle}</p>}
            </div>
            <span className="w3-btn shrink-0">Resume <ChevronRight className="h-4 w-4" /></span>
          </Link>
        )}

        {}
        <section className="grid gap-4 md:grid-cols-4">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-1">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 120 120" className="h-24 w-24 -rotate-90">
                <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="12" />
                <circle cx="60" cy="60" r="54" fill="none" stroke="#b85c38" strokeWidth="12" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - overall / 100)} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-slate-900">{overall}%</span>
            </div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall</p><p className="text-sm text-slate-700">{stats.modulesDone} of {totalModules} modules</p></div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Flame className="h-4 w-4 text-orange-500" /> Study streak</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{streak.current}<span className="ml-1 text-base font-semibold text-slate-500"> {streak.current === 1 ? 'day' : 'days'}</span></p>
            <p className="text-xs text-slate-500">Best: {streak.best} days</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Trophy className="h-4 w-4 text-amber-500" /> Level {xp.level}</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{xp.xp}<span className="ml-1 text-base font-semibold text-slate-500"> XP</span></p>
            <div className="mt-2 h-2 bg-slate-100"><div className="h-full bg-[#b85c38]" style={{ width: `${xp.progress}%` }} /></div>
            <p className="mt-1 text-[11px] text-slate-500">{xp.next} XP to level {xp.level + 1}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Target className="h-4 w-4 text-[#ea2027]" /> Quiz average</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{avgScore === null ? '–' : `${avgScore}%`}</p>
            <p className="text-xs text-slate-500">{history.length} quizzes taken</p>
          </div>
        </section>

        {}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-xl font-bold text-slate-900">Study activity</h2>
            <p className="mb-4 text-xs text-slate-500">Last 14 days. A terracotta square marks a study day.</p>
            <div className="grid grid-cols-7 gap-2">
              {week.length ? week.map((w) => (
                <div key={w.d} title={w.d} className={`flex aspect-square items-center justify-center rounded-md text-[10px] font-bold ${w.on ? 'bg-[#b85c38] text-white' : 'bg-slate-100 text-slate-400'}`}>{w.d.slice(8)}</div>
              )) : Array.from({ length: 14 }, (_, i) => <div key={i} className="aspect-square animate-pulse rounded-md bg-slate-100" />)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-xl font-bold text-slate-900">Quiz score trend</h2>
            <p className="mb-3 text-xs text-slate-500">Your last {Math.min(history.length, 12)} quiz results (%)</p>
            {history.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">Take a quiz to see your trend here.</p>
            ) : (
              <AreaChart color="#6d6055" height={170} data={history.slice(-12).map((h, i) => ({ label: `0000-${String(i + 1).padStart(2, '0')}`, value: h.score }))} />
            )}
          </div>
        </section>

        {}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-xl font-bold text-slate-900">Module completion</h2>
            <p className="mb-4 text-xs text-slate-500">Your completed modules across every course.</p>
            {loading ? (
              <div className="mx-auto h-40 w-40 animate-pulse rounded-full bg-orange-50" />
            ) : (
              <Donut
                slices={[
                  { label: 'Completed', value: stats.modulesDone, color: '#b85c38' },
                  { label: 'To go', value: Math.max(0, totalModules - stats.modulesDone), color: '#f2dac7' },
                ]}
                centerLabel="complete"
                centerValue={`${overall}%`}
              />
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Course progress</h2>
          {loading ? (
            <div className="space-y-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : (
            <div className="space-y-4">
              {courses.filter((c) => (moduleCount[c.id] || 0) > 0).map((c) => {
                const done = completed[c.id]?.length || 0;
                const total = moduleCount[c.id] || 0;
                const pct = Math.min(100, Math.round((done / total) * 100));
                return (
                  <Link key={c.id} href={`/course/${c.id}`} className="block rounded-xl border border-slate-100 p-3 transition hover:border-orange-200 hover:bg-orange-50/40">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="truncate text-sm font-bold text-slate-900">{c.title}</h3>
                      <span className="text-sm font-bold text-orange-700">{pct}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-600 transition-all" style={{ width: `${pct}%` }} /></div>
                    <p className="mt-1 text-[11px] text-slate-500">{done} of {total} modules complete</p>
                  </Link>
                );
              })}
            </div>
          )}
          </div>
        </section>

        {}
        <section>
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-bold text-slate-900"><Award className="h-6 w-6 text-amber-500" /> Achievements</h2>
          <p className="mb-4 text-sm text-slate-500">{unlocked.length} of {BADGES.length} unlocked</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {BADGES.map((b) => {
              const ok = b.test(stats);
              return (
                <div key={b.id} className={`rounded-2xl p-4 text-center ring-1 ${ok ? 'bg-[#f1ece5] ring-[#b85c38]' : 'bg-white opacity-60 ring-slate-200'}`}>
                  <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full ${ok ? 'bg-[#b85c38] text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {ok ? <Award className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                  </div>
                  <p className="text-sm font-bold text-slate-900">{b.title}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-slate-900"><Bookmark className="h-6 w-6 text-[#6d6055]" /> Saved modules</h2>
          {bookmarks.length === 0 ? (
            <p className="bg-[#f1ece5] p-5 text-sm text-slate-600">No bookmarks yet. Press the bookmark button on any module to save it here.</p>
          ) : (
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
              {bookmarks.map((b) => (
                <li key={b.moduleId}>
                  <Link href={`/course/${b.courseId}?module=${b.moduleId}`} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50">
                    <span><span className="font-semibold text-slate-900">{b.title}</span>{b.courseTitle && <span className="ml-2 text-xs text-slate-500">{b.courseTitle}</span>}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
