'use client';

import { useCallback, useEffect, useState } from 'react';
import { Users, Eye, Sparkles, ListChecks, CheckCircle2, Target, MessageCircle, Download, RefreshCw } from 'lucide-react';
import { AreaChart, BarList, Donut } from './Charts';

interface Analytics {
  setupNeeded?: boolean;
  error?: string | null;
  days: number;
  library: { courses: number; modules: number; mcqs: number };
  totals: {
    visitors: number; returningVisitors: number; pageViews: number; moduleViews: number; summaries: number;
    quizzes: number; completions: number; tutorMessages: number; avgScore: number | null; passRate: number | null;
  };
  daily: { date: string; visitors: number; views: number; quizzes: number; summaries: number }[];
  topModules: { id: string; title: string; course: string; views: number; avgScore: number | null }[];
  topCourses: { id: string; title: string; views: number }[];
  weakestModules: { id: string; title: string; course: string; avgScore: number | null; quizzes: number }[];
  scoreBuckets: { label: string; count: number }[];
  recent: { at: string; event: string; module: string | null; value: number | null }[];
}

const EVENT_LABEL: Record<string, string> = {
  page_view: 'Opened the library',
  module_view: 'Read a module',
  summary_generated: 'Generated an AI summary',
  quiz_completed: 'Completed a quiz',
  module_completed: 'Marked a module complete',
  tutor_message: 'Asked the AI tutor',
};

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Kpi({ icon: Icon, label, value, hint, accent }: { icon: typeof Users; label: string; value: string | number; hint?: string; accent: string }) {
  return (
    <div className="border-b-4 bg-[#f1ece5] p-4" style={{ borderColor: accent }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <span className="block text-3xl font-bold text-slate-900">{value}</span>
      {hint && <span className="text-[11px] font-medium text-slate-500">{hint}</span>}
    </div>
  );
}

export default function AnalyticsPanel() {
  const [days, setDays] = useState(14);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`, { cache: 'no-store' });
      const json = await res.json();
      if (res.status === 401) throw new Error('Your admin session expired. Please log out and sign in again.');
      if (!res.ok && !json.setupNeeded) throw new Error(json.error || 'Could not load analytics.');
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ['Date', 'Visitors', 'Views', 'Quizzes', 'AI summaries'],
      ...data.daily.map((d) => [d.date, d.visitors, d.views, d.quizzes, d.summaries]),
      [],
      ['Module', 'Course', 'Views', 'Avg quiz score %'],
      ...data.topModules.map((m) => [m.title, m.course, m.views, m.avgScore ?? '']),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `campusnotes-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-w-0 flex-1">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded border border-slate-300">
            {[7, 14, 30].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 text-xs font-bold ${days === d ? 'bg-[#b85c38] text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}>{d} days</button>
            ))}
          </div>
          <button onClick={load} className="w3-btn w3-btn-dark text-xs" title="Refresh"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          <button onClick={exportCsv} disabled={!data || data.setupNeeded} className="w3-btn text-xs"><Download className="h-3.5 w-3.5" /> Export CSV</button>
        </div>
      </div>

      {err && <div className="mb-4 border-l-4 border-red-500 bg-red-50 p-4 text-sm font-semibold text-red-700">{err}</div>}
      {loading && !data && <div className="h-64 animate-pulse bg-[#f1ece5]" />}

      {data?.setupNeeded && (
        <div className="border-l-[5px] border-amber-500 bg-amber-50 p-5 text-sm leading-7 text-slate-800">
          <h2 className="mb-1 text-lg font-bold">One-time setup needed</h2>
          <p>The <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">analytics_events</code> table does not exist yet. Open <b>Supabase → SQL Editor</b>, paste the contents of <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">supabase/analytics.sql</code>, press <b>Run</b>, then refresh this page. Tracking starts automatically.</p>
        </div>
      )}

      {data && !data.setupNeeded && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={Users} label="Unique learners" value={data.totals.visitors} hint={`${data.totals.returningVisitors} came back`} accent="#6d6055" />
            <Kpi icon={Eye} label="Module views" value={data.totals.moduleViews} hint={`${data.totals.pageViews} library visits`} accent="#b85c38" />
            <Kpi icon={Sparkles} label="AI summaries" value={data.totals.summaries} hint={`${data.totals.tutorMessages} tutor questions`} accent="#d08c4c" />
            <Kpi icon={ListChecks} label="Quizzes taken" value={data.totals.quizzes} hint={`${data.totals.completions} modules completed`} accent="#ea2027" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
              <h2 className="mb-1 text-lg font-bold text-slate-900">Daily active learners</h2>
              <p className="mb-3 text-xs text-slate-500">Unique visitors per day, last {data.days} days</p>
              <AreaChart data={data.daily.map((d) => ({ label: d.date, value: d.visitors }))} />
            </section>
            <section className="bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-1 text-lg font-bold text-slate-900">Quiz performance</h2>
              <p className="mb-4 text-xs text-slate-500">Score distribution of all attempts</p>
              <Donut
                centerLabel="average score"
                centerValue={data.totals.avgScore === null ? '–' : `${data.totals.avgScore}%`}
                slices={[
                  { label: '0–39%', value: data.scoreBuckets[0].count, color: '#ea2027' },
                  { label: '40–59%', value: data.scoreBuckets[1].count, color: '#f59e0b' },
                  { label: '60–79%', value: data.scoreBuckets[2].count, color: '#6d6055' },
                  { label: '80–100%', value: data.scoreBuckets[3].count, color: '#b85c38' },
                ]}
              />
              <p className="mt-4 text-xs font-semibold text-slate-500">Pass rate (≥ 50%): <span className="text-slate-900">{data.totals.passRate === null ? '–' : `${data.totals.passRate}%`}</span></p>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-4 text-lg font-bold text-slate-900">Most read modules</h2>
              <BarList rows={data.topModules.map((m) => ({ label: m.title.replace(/^Module\s*\d+:\s*/i, ''), sub: m.course, value: m.views }))} empty="No module views yet. Open a module as a student to see data here." />
            </section>
            <section className="bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-4 text-lg font-bold text-slate-900">Most popular courses</h2>
              <BarList color="#6d6055" rows={data.topCourses.map((c) => ({ label: c.title, value: c.views }))} empty="No course activity yet." />
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900"><Target className="h-5 w-5 text-[#ea2027]" /> Modules students find hardest</h2>
              <p className="mb-4 text-xs text-slate-500">Lowest average quiz score. Good candidates for better notes.</p>
              {data.weakestModules.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">No quiz attempts yet.</p>
              ) : (
                <table className="w-full border-collapse text-left text-sm">
                  <thead><tr className="bg-[#b85c38] text-white"><th className="p-2.5">Module</th><th className="p-2.5 text-center">Attempts</th><th className="p-2.5 text-center">Avg score</th></tr></thead>
                  <tbody>
                    {data.weakestModules.map((m) => (
                      <tr key={m.id} className="even:bg-[#f4efe8]">
                        <td className="p-2.5 font-medium text-slate-800">{m.title}</td>
                        <td className="p-2.5 text-center text-slate-600">{m.quizzes}</td>
                        <td className={`p-2.5 text-center font-bold ${(m.avgScore ?? 0) < 50 ? 'text-[#ea2027]' : 'text-[#b85c38]'}`}>{m.avgScore}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
            <section className="bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900"><MessageCircle className="h-5 w-5 text-[#6d6055]" /> Live activity</h2>
              {data.recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">Nothing yet. Activity appears here as students use the site.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recent.map((r, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                      <span className="flex items-start gap-2 text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#b85c38]" />
                        <span>{EVENT_LABEL[r.event] ?? r.event}{r.module ? <span className="text-slate-500"> – {r.module.replace(/^Module\s*\d+:\s*/i, '')}</span> : null}{r.event === 'quiz_completed' && r.value !== null ? <b className="text-slate-900"> ({Math.round(r.value)}%)</b> : null}</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">{timeAgo(r.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <p className="text-xs text-slate-500">Library size: {data.library.courses} courses · {data.library.modules} modules · {data.library.mcqs} quiz questions. Learners are counted anonymously (random id in the browser, no personal data).</p>
        </div>
      )}
    </main>
  );
}
