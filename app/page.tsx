// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { BookOpen, Search, ChevronLeft, ChevronRight, CheckCircle2, X, ArrowRight, Clock3, Layers3, Sparkles, Brain, ListChecks, MessageCircle, Flame, ChartColumn, Moon, Printer, Bookmark } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { PartnerLogos } from '@/components/Brand';
import { track } from '@/lib/track';
import { getLastVisit, getStreak, getStudyDays, LastVisit } from '@/lib/progress';

interface Course {
  id: string;
  code: string;
  title: string;
  university: string;
  category: string;
  module_count: number;
}

const CATEGORY_STYLES: Record<string, string> = {
  'Computer Science': 'from-teal-500 to-emerald-600',
  'Software Engineering': 'from-sky-500 to-indigo-600',
  'Information Technology': 'from-cyan-500 to-blue-600',
  'Artificial Intelligence': 'from-violet-500 to-fuchsia-600',
  'Cyber Security': 'from-rose-500 to-red-600',
  'Data Science': 'from-amber-500 to-orange-600',
  'Human Resources': 'from-pink-500 to-rose-500',
};

const CATEGORIES = [
  'All',
  'Computer Science',
  'Software Engineering',
  'Information Technology',
  'Artificial Intelligence',
  'Cyber Security',
  'Data Science',
  'Human Resources',
];

export default function SeaGreenHomeScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // My Progress Modal State
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [lastVisit, setLastVisitState] = useState<LastVisit | null>(null);
  const [streak, setStreak] = useState(0);
  const [userProgressData, setUserProgressData] = useState<Record<string, string[]>>({});
  const [moduleCounts, setModuleCounts] = useState<Record<string, number>>({});
  const [quizStats, setQuizStats] = useState({ attempts: 0, attemptedQuizzes: 0, averageBest: 0 });

  useEffect(() => {
    track('page_view');
    setLastVisitState(getLastVisit());
    setStreak(getStreak(getStudyDays()).current);
  }, []);

  useEffect(() => {
    document.title = 'CampusNotes';
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    fetchCourses();
    loadAllUserProgress();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setCourses(data);
      const { data: modulesData } = await supabase.from('modules').select('course_id');
      if (modulesData) {
        const counts: Record<string, number> = {};
        modulesData.forEach((module: { course_id: string }) => {
          counts[module.course_id] = (counts[module.course_id] || 0) + 1;
        });
        setModuleCounts(counts);
      }
    }
    setLoading(false);
  };

  // Read progress for all courses from LocalStorage
  const loadAllUserProgress = () => {
    const progressMap: Record<string, string[]> = {};
    let quizAttempts = 0;
    let attemptedQuizzes = 0;
    let bestTotal = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('progress_')) {
        const courseId = key.replace('progress_', '');
        try {
          const completedIds = JSON.parse(localStorage.getItem(key) || '[]');
          progressMap[courseId] = completedIds;
        } catch (e) {
          console.error(e);
        }
      } else if (key && key.startsWith('quiz_stats_')) {
        try {
          const saved = JSON.parse(localStorage.getItem(key) || '{"attempts":0,"best":0}');
          const attempts = Number(saved.attempts) || 0;
          const best = Number(saved.best) || 0;
          if (attempts > 0) {
            quizAttempts += attempts;
            attemptedQuizzes += 1;
            bestTotal += best;
          }
        } catch {}
      }
    }
    setUserProgressData(progressMap);
    setQuizStats({
      attempts: quizAttempts,
      attemptedQuizzes,
      averageBest: attemptedQuizzes > 0 ? Math.round(bestTotal / attemptedQuizzes) : 0,
    });
  };

  const handleOpenProgress = () => {
    loadAllUserProgress();
    setShowProgressModal(true);
  };

  const filteredCourses = courses.filter((course) => {
    const matchesCategory =
      selectedCategory === 'All' || course.category === selectedCategory;
    const matchesSearch =
      course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage) || 1;
  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Overall Stats Calculation
  const totalAvailableModules = courses.reduce((acc, curr) => acc + (moduleCounts[curr.id] || curr.module_count || 0), 0);
  const totalCompletedModules = Object.values(userProgressData).reduce((acc, curr) => acc + curr.length, 0);
  const overallPercentage = totalAvailableModules > 0 ? Math.round((totalCompletedModules / totalAvailableModules) * 100) : 0;

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <SiteHeader
        center={
          <div className="flex w-full max-w-md items-center rounded-full bg-white px-4 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
            <input type="text" aria-label="Search courses" placeholder="Search tutorials..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
          </div>
        }
      >
        <Link href={user?.role === 'ADMIN' ? '/admin' : '/login'} className="rounded bg-[#04AA6D] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#059862]">Admin</Link>
      </SiteHeader>

      {/* Category tabs (like W3Schools' second bar) */}
      <nav className="sticky top-[62px] z-30 border-b border-black/20 bg-[#3d4052]">
        <div className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-4 sm:px-6">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
              className={`shrink-0 px-4 py-2.5 text-[13px] font-semibold transition ${selectedCategory === cat ? 'bg-[#04AA6D] text-white' : 'text-slate-200 hover:bg-[#282A35]'}`}>
              {cat}
            </button>
          ))}
        </div>
      </nav>

      <main>
        {/* HERO */}
        <section className="hero-bg">
          <div className="mx-auto grid max-w-[1400px] items-center gap-8 px-6 py-12 md:grid-cols-[1.4fr_1fr] md:py-16">
            <div>
              <h1 className="text-4xl font-bold leading-tight text-white md:text-6xl">
                Learn <span className="text-[#2ee89e]">anything</span><br />with CampusNotes
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
                Easy-to-follow tutorials, instant AI summaries and practice quizzes — free for every student.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#catalogue" className="w3-btn px-7 py-3 text-base">Get Started ❯</a>
                <Link href="/progress" className="rounded border border-white/40 px-7 py-3 text-base font-semibold text-white transition hover:bg-white/10">My Progress</Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-8 text-white">
                <div><strong className="block text-3xl">{courses.length}</strong><span className="text-xs uppercase tracking-wider text-slate-400">Tutorials</span></div>
                <div><strong className="block text-3xl">{totalAvailableModules}</strong><span className="text-xs uppercase tracking-wider text-slate-400">Modules</span></div>
                <div><strong className="block text-3xl">Free</strong><span className="text-xs uppercase tracking-wider text-slate-400">Forever</span></div>
              </div>
            </div>
            <div className="hidden justify-center md:flex">
              <div className="flex h-72 w-72 items-center justify-center rounded-full bg-white shadow-2xl shadow-black/40 ring-8 ring-[#04AA6D]/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/campusnotes.svg" alt="CampusNotes emblem" className="h-60 w-60" />
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 bg-black/20">
            <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-3 px-6 py-3 sm:flex-row">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">An initiative by</span>
              <div className="flex items-center gap-4"><PartnerLogos size="md" showDivider={false} /><span className="hidden text-sm font-semibold text-slate-200 md:block">Punjab Tianjin University of Technology</span></div>
            </div>
          </div>
        </section>

        {lastVisit && (
          <section className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-4">
                {streak > 0 && (
                  <span className="flex items-center gap-1.5 rounded bg-orange-50 px-3 py-1.5 text-sm font-bold text-orange-600"><Flame className="h-4 w-4" /> {streak}-day streak</span>
                )}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#04AA6D]">Continue learning</p>
                  <p className="text-sm font-semibold text-slate-900">{lastVisit.title}{lastVisit.courseTitle ? <span className="font-normal text-slate-500"> · {lastVisit.courseTitle}</span> : null}</p>
                </div>
              </div>
              <Link href={`/course/${lastVisit.courseId}`} className="w3-btn text-sm">Resume ❯</Link>
            </div>
          </section>
        )}

        {/* TUTORIALS */}
        <section id="catalogue" className="scroll-mt-28 bg-[#E7E9EB] py-10">
          <div className="mx-auto max-w-[1400px] px-6">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-3xl font-bold text-slate-900">Tutorials</h2>
              <span className="text-sm font-semibold text-slate-600">{filteredCourses.length} results</span>
            </div>

            <div className="mb-6 md:hidden">
              <input type="text" aria-label="Search courses" placeholder="Search tutorials..." value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full rounded border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#04AA6D]" />
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse bg-white" />)}</div>
            ) : paginatedCourses.length === 0 ? (
              <div className="bg-white py-14 text-center text-sm text-slate-500">No matching tutorials found.</div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {paginatedCourses.map((course) => {
                  const moduleCount = moduleCounts[course.id] || course.module_count || 0;
                  const done = userProgressData[course.id]?.length || 0;
                  const pct = moduleCount > 0 ? Math.min(100, Math.round((done / moduleCount) * 100)) : 0;
                  return (
                    <article key={course.id} className="flex flex-col border-t-4 border-[#04AA6D] bg-white shadow-sm transition hover:shadow-xl">
                      <div className="flex-1 p-6">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="rounded bg-[#282A35] px-2.5 py-1 text-[11px] font-bold tracking-wider text-white">{course.code}</span>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{course.category}</span>
                        </div>
                        <h3 className="min-h-14 text-xl font-bold leading-7 text-slate-900">{course.title}</h3>
                        <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-slate-500">
                          <span className="flex items-center gap-1.5"><Layers3 className="h-3.5 w-3.5 text-[#04AA6D]" />{moduleCount} modules</span>
                          <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-[#04AA6D]" />Self-paced</span>
                        </div>
                        <div className="mt-4">
                          <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-400"><span>{done} of {moduleCount} done</span><span>{pct}%</span></div>
                          <div className="h-1.5 bg-slate-200"><div className="h-full bg-[#04AA6D] transition-all" style={{ width: `${pct}%` }} /></div>
                        </div>
                      </div>
                      <Link href={`/course/${course.id}`} className="w3-btn m-6 mt-0 justify-center rounded text-sm">Learn {course.code} ❯</Link>
                    </article>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-1.5 text-sm font-bold">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="w3-btn w3-btn-dark rounded">❮</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`h-10 w-10 rounded ${currentPage === page ? 'bg-[#04AA6D] text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}>{page}</button>
                ))}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w3-btn w3-btn-dark rounded">❯</button>
              </div>
            )}
          </div>
        </section>

        {/* FEATURES */}
        <section className="bg-white py-14">
          <div className="mx-auto max-w-[1400px] px-6">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">Everything you need to study smarter</h2>
              <p className="mt-3 text-slate-600">CampusNotes is more than a library of notes. It helps you understand, practise and track your learning.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Brain, title: 'AI summaries', text: 'One click turns a long module into key concepts, takeaways and exam-style questions.', color: '#7c3aed' },
                { icon: MessageCircle, title: 'AI tutor chat', text: 'Ask questions about the module you are reading and get answers based on your own notes.', color: '#04AA6D' },
                { icon: ListChecks, title: 'Practice quizzes', text: 'Test yourself with multiple-choice questions and read the explanation for every answer.', color: '#ea2027' },
                { icon: ChartColumn, title: 'Progress tracking', text: 'See completed modules, quiz scores, study streaks and unlock achievement badges.', color: '#035492' },
                { icon: Bookmark, title: 'Save and resume', text: 'Bookmark important modules and continue exactly where you stopped last time.', color: '#f59e0b' },
                { icon: Printer, title: 'Print or save as PDF', text: 'Export any module as a clean printable page for offline revision.', color: '#0891b2' },
              ].map((f) => (
                <div key={f.title} className="border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded" style={{ background: `${f.color}1a`, color: f.color }}><f.icon className="h-5 w-5" /></span>
                  <h3 className="text-lg font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-[#282A35] py-14 text-white">
          <div className="mx-auto max-w-[1400px] px-6">
            <h2 className="mb-10 text-center text-3xl font-bold md:text-4xl">How it works</h2>
            <div className="grid gap-6 md:grid-cols-4">
              {[
                ['1', 'Choose a tutorial', 'Browse courses by subject or search by name or code.'],
                ['2', 'Read the module', 'Clear notes with tables, diagrams and examples.'],
                ['3', 'Ask AI for help', 'Get a summary or ask the tutor to explain anything.'],
                ['4', 'Test yourself', 'Take the quiz, review answers and watch your level grow.'],
              ].map(([n, t, d]) => (
                <div key={n} className="relative border border-white/10 bg-white/5 p-6">
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#04AA6D] text-lg font-bold">{n}</span>
                  <h3 className="text-lg font-bold">{t}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-300">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white py-14">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="mb-8 text-center text-3xl font-bold text-slate-900">Frequently asked questions</h2>
            <div className="divide-y divide-slate-200 border border-slate-200">
              {[
                ['Do I need an account?', 'No. Students can read notes, use the AI tools and take quizzes without signing up. Your progress is saved on your own device.'],
                ['Where does the AI summary come from?', 'It is generated from the notes of the module you are reading, so it stays relevant to your course material.'],
                ['Is my data collected?', 'Only anonymous usage counts (for example how many learners opened a module). No names, emails or personal details are stored.'],
                ['Who maintains the content?', 'Course material is added and reviewed by administrators of the PTUT / ASTC team through the admin portal.'],
              ].map(([q, a]) => (
                <details key={q} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900">{q}<span className="text-xl text-[#04AA6D] transition group-open:rotate-45">+</span></summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
