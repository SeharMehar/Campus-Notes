// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { BookOpen, Search, ChevronLeft, ChevronRight, CheckCircle2, X, ArrowRight, Clock3, Layers3, GraduationCap } from 'lucide-react';

interface Course {
  id: string;
  code: string;
  title: string;
  university: string;
  category: string;
  module_count: number;
}

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
  const [userProgressData, setUserProgressData] = useState<Record<string, string[]>>({});
  const [moduleCounts, setModuleCounts] = useState<Record<string, number>>({});
  const [quizStats, setQuizStats] = useState({ attempts: 0, attemptedQuizzes: 0, averageBest: 0 });

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
    <div className="min-h-screen bg-white text-[#334155] font-sans flex flex-col justify-between">
      <div>
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#14b8a6] text-white shadow-lg shadow-teal-200/40">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-black tracking-tight text-[#14b8a6]">CampusNotes</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#14b8a6]">Academic Library</div>
              </div>
            </Link>

            <div className="hidden w-full max-w-xl items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
              <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                aria-label="Search courses"
                placeholder="Search courses or subject codes"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-transparent text-sm text-[#334155] outline-none placeholder:text-slate-400"
              />
            </div>

            <nav className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <Link href="/" className="hidden rounded-lg px-3 py-2 text-[#14b8a6] md:block">Courses</Link>
              <button
                onClick={handleOpenProgress}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 transition hover:border-teal-200 hover:bg-teal-50 hover:text-[#14b8a6]"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">My Progress</span>
              </button>
              <Link href={user?.role === 'ADMIN' ? '/admin' : '/login'} className="rounded-lg bg-[#14b8a6] px-4 py-2 text-white transition hover:bg-[#14b8a6]">
                Admin
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <section className="relative mb-10 overflow-hidden rounded-[28px] bg-[#14b8a6] px-8 py-10 text-white shadow-xl shadow-teal-200/40 md:px-12 md:py-12">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[40px] border-white/5" />
            <div className="absolute bottom-0 right-24 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
            <div className="relative max-w-2xl">
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]">
                <GraduationCap className="h-3.5 w-3.5" /> Open academic library
              </span>
              <h1 className="text-3xl font-black leading-tight md:text-5xl">Learn clearly. Study confidently.</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-teal-50 md:text-base">
                Structured course notes, visual explanations, and focused practice resources — organised for productive learning.
              </p>
              <div className="mt-7 grid max-w-lg grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3"><strong className="block text-xl">{courses.length}</strong><span className="text-[10px] font-bold uppercase tracking-wider text-teal-100">Courses</span></div>
                <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3"><strong className="block text-xl">{totalAvailableModules}</strong><span className="text-[10px] font-bold uppercase tracking-wider text-teal-100">Modules</span></div>
                <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3"><strong className="block text-xl">Free</strong><span className="text-[10px] font-bold uppercase tracking-wider text-teal-100">Access</span></div>
              </div>
            </div>
          </section>

          <div className="mb-7 md:hidden">
            <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
              <Search className="mr-2 h-4 w-4 text-slate-400" />
              <input type="text" aria-label="Search courses" placeholder="Search courses" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full text-sm outline-none" />
            </div>
          </div>

          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#14b8a6]">Course catalogue</p>
              <h2 className="text-2xl font-black tracking-tight text-[#14b8a6]">Explore subjects</h2>
            </div>
            <span className="text-xs font-bold text-slate-400">{filteredCourses.length} results</span>
          </div>

          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                    isSelected
                      ? 'bg-[#14b8a6] text-white shadow-md'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-[#14b8a6]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="text-center py-16 text-xs text-teal-600 font-semibold">
              Loading courses...
            </div>
          ) : paginatedCourses.length === 0 ? (
            <div className="text-center py-16 border-2 border-teal-500/20 rounded-2xl text-xs text-gray-500 bg-teal-50/20">
              No matching courses found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {paginatedCourses.map((course) => {
                const moduleCount = moduleCounts[course.id] || course.module_count || 0;
                return (
                  <article key={course.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl hover:shadow-slate-200/60">
                    <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-black tracking-[0.08em] text-[#14b8a6] ring-1 ring-slate-200">
                          {course.code}
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-[#14b8a6] transition group-hover:bg-[#14b8a6] group-hover:text-white">
                          <BookOpen className="h-4 w-4" />
                        </span>
                      </div>
                      <h2 className="min-h-12 text-base font-black leading-6 text-[#14b8a6]">{course.title}</h2>
                    </div>
                    <div className="px-5 py-4">
                      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{course.category}</span>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                          <span className="flex items-center gap-1"><Layers3 className="h-3.5 w-3.5 text-[#14b8a6]" />{moduleCount} modules</span>
                          <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-[#14b8a6]" />Self-paced</span>
                        </div>
                        <Link href={`/course/${course.id}`} aria-label={`Open ${course.title}`} className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#14b8a6] text-white transition group-hover:bg-[#14b8a6]">
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* MY PROGRESS MODAL POPUP */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-[#14b8a6]/35 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-teal-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-teal-100 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-teal-500" />
                <h2 className="text-lg font-black text-teal-900">My Learning Progress</h2>
              </div>
              <button
                onClick={() => setShowProgressModal(false)}
                className="p-1 rounded-xl hover:bg-teal-50 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Completion Banner */}
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-center mb-6">
              <span className="text-3xl font-black text-teal-800 block mb-1">{overallPercentage}%</span>
              <span className="text-xs font-bold text-gray-600">
                Overall Completed ({totalCompletedModules} of {totalAvailableModules} total modules)
              </span>
              <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden border border-teal-300 mt-3">
                <div
                  className="bg-teal-500 h-full transition-all duration-500"
                  style={{ width: `${overallPercentage}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl border border-teal-100 bg-white p-3 text-center">
                <strong className="block text-lg text-teal-800">{totalCompletedModules}</strong>
                <span className="text-[10px] font-bold text-gray-500">Modules Done</span>
              </div>
              <div className="rounded-xl border border-teal-100 bg-white p-3 text-center">
                <strong className="block text-lg text-teal-800">{quizStats.attempts}</strong>
                <span className="text-[10px] font-bold text-gray-500">Quiz Attempts</span>
              </div>
              <div className="rounded-xl border border-teal-100 bg-white p-3 text-center">
                <strong className="block text-lg text-teal-800">{quizStats.averageBest}%</strong>
                <span className="text-[10px] font-bold text-gray-500">Average Best</span>
              </div>
            </div>

            {/* Course-wise Breakdown */}
            <h3 className="text-xs font-extrabold text-gray-700 uppercase mb-3">Courses Summary</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {courses.map((course) => {
                const completedCount = userProgressData[course.id]?.length || 0;
                const totalCount = moduleCounts[course.id] || course.module_count || 0;
                const coursePercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                return (
                  <div key={course.id} className="border border-teal-200 rounded-xl p-3 bg-gray-50/50 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#334155]">{course.code}: {course.title}</h4>
                      <p className="text-[10px] text-gray-500 font-semibold">{completedCount} of {totalCount} modules done</p>
                    </div>
                    <span className="text-xs font-extrabold text-teal-800 bg-teal-100 px-2.5 py-1 rounded-lg">
                      {coursePercent}%
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-teal-100 mt-6 flex justify-end">
              <button
                onClick={() => setShowProgressModal(false)}
                className="bg-teal-500 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-teal-600 transition"
              >
                Close Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 text-center text-xs font-bold text-gray-700 border-t border-teal-500/20 mt-8">
        <div className="inline-flex items-center gap-3 cursor-pointer">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1 border border-teal-500/30 rounded-lg disabled:opacity-30 hover:bg-teal-50"
          >
            <ChevronLeft className="w-4 h-4 text-teal-600" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <span
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-2.5 py-1 rounded-lg ${
                currentPage === page
                  ? 'bg-teal-500 text-white font-black'
                  : 'text-gray-600 hover:bg-teal-50'
              }`}
            >
              {page}
            </span>
          ))}
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-1 border border-teal-500/30 rounded-lg disabled:opacity-30 hover:bg-teal-50"
          >
            <ChevronRight className="w-4 h-4 text-teal-600" />
          </button>
        </div>
      </footer>
    </div>
  );
}