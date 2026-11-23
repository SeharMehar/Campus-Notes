'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  ArrowRight,
  Bookmark,
  Brain,
  ChartColumnIncreasing,
  CheckCircle2,
  Clock3,
  Flame,
  Layers3,
  ListChecks,
  MessageCircle,
  Printer,
  Search,
  Sparkles,
} from 'lucide-react';
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

const CATEGORY_IMAGES: Record<string, string> = {
  'Computer Science': 'photo-1518770660439-4636190af475',
  'Software Engineering': 'photo-1555066931-4365d14bab8c',
  'Information Technology': 'photo-1516321318423-f06f85e504b3',
  'Artificial Intelligence': 'photo-1677442136019-21780ecad995',
  'Cyber Security': 'photo-1550751827-4bd374c3f58b',
  'Data Science': 'photo-1551288049-bebda4e38f71',
  'Human Resources': 'photo-1521737711867-e3b97375f902',
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

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-powered summaries',
    text: 'Turn lengthy course material into clear, focused revision notes in seconds.',
    color: '#b85c38',
  },
  {
    icon: MessageCircle,
    title: 'Your personal AI tutor',
    text: 'Ask questions about the module you are studying and get relevant explanations.',
    color: '#b85c38',
  },
  {
    icon: ListChecks,
    title: 'Practice that sticks',
    text: 'Check your understanding with quizzes, explanations and study flashcards.',
    color: '#d08c4c',
  },
  {
    icon: ChartColumnIncreasing,
    title: 'See your progress',
    text: 'Keep track of finished modules, quiz scores and the habits you are building.',
    color: '#6d6055',
  },
  {
    icon: Bookmark,
    title: 'Pick up where you left off',
    text: 'Save useful modules and quickly return to the lessons that matter to you.',
    color: '#c96f55',
  },
  {
    icon: Printer,
    title: 'Ready for offline revision',
    text: 'Print course modules or save them as a clean PDF for later study.',
    color: '#8b634a',
  },
];

export default function CampusNotesHome() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [user, setUser] = useState<{ role?: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisit, setLastVisit] = useState<LastVisit | null>(null);
  const [streak, setStreak] = useState(0);
  const [userProgressData, setUserProgressData] = useState<Record<string, string[]>>({});
  const [moduleCounts, setModuleCounts] = useState<Record<string, number>>({});
  const itemsPerPage = 6;

  useEffect(() => {
    track('page_view');
    
    
    setLastVisit(getLastVisit());
    setStreak(getStreak(getStudyDays()).current);

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }

    const progressMap: Record<string, string[]> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('progress_')) continue;
      try {
        const saved = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(saved)) progressMap[key.slice('progress_'.length)] = saved;
      } catch (error) {
        console.warn(`Unable to read saved progress for ${key}.`, error);
      }
    }
    setUserProgressData(progressMap);

    async function fetchCourses() {
      setLoading(true);
      setLoadError('');

      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const { data: modules, error: modulesError } = await supabase
          .from('modules')
          .select('course_id');

        if (modulesError) throw modulesError;

        const counts: Record<string, number> = {};
        modules?.forEach((module: { course_id: string }) => {
          counts[module.course_id] = (counts[module.course_id] || 0) + 1;
        });
        setCourses(data || []);
        setModuleCounts(counts);
      } catch (error) {
        console.error('Unable to load the course catalogue:', error);
        setLoadError('We couldn’t load the course catalogue. Please try again in a moment.');
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  const filteredCourses = useMemo(() => courses.filter((course) => {
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query
      || course.title?.toLowerCase().includes(query)
      || course.code?.toLowerCase().includes(query)
      || course.category?.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  }), [courses, searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage) || 1;
  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const totalModules = courses.reduce(
    (total, course) => total + (moduleCounts[course.id] || course.module_count || 0),
    0,
  );

  const updateSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  return (
    <div className="landing-page min-h-screen text-slate-800">
      <SiteHeader
        center={
          <label className="flex w-full max-w-[390px] items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 transition focus-within:border-orange-700 focus-within:bg-white">
            <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="search"
              aria-label="Search courses"
              placeholder="Find a course or subject"
              value={searchQuery}
              onChange={(event) => updateSearch(event.target.value)}
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </label>
        }
      >
        <Link
          href={user?.role === 'ADMIN' ? '/admin' : '/login'}
          className="rounded-full bg-[#6f3024] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#6f3024] sm:px-5"
        >
          Admin portal
        </Link>
      </SiteHeader>

      <main>
        <section className="landing-hero overflow-hidden">
          <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-5 pb-14 pt-12 sm:px-8 md:gap-8 md:pb-20 md:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:px-12 lg:pt-20">
            <div className="fade-up relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-900/10 bg-white/80 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.13em] text-[#a45232] shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                A smarter way to study
              </span>
              <h1 className="mt-6 max-w-[650px] text-[2.8rem] font-semibold leading-[1.07] tracking-[-0.055em] text-[#2e2420] sm:text-6xl lg:text-[4.35rem]">
                Make room for
                <span className="block font-serif font-medium italic text-[#cf7958]">your next big idea.</span>
              </h1>
              <p className="mt-6 max-w-[530px] text-[15px] leading-7 text-slate-600 sm:text-[17px] sm:leading-8">
                Your university courses, helpful AI study tools and progress — all in one calm, focused place.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#catalogue"
                  className="inline-flex items-center gap-2 rounded-full bg-[#88432c] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-950/10 transition hover:-translate-y-0.5 hover:bg-[#6f3024]"
                >
                  Explore courses <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  href="/progress"
                  className="rounded-full border border-slate-300/80 bg-white/60 px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:border-orange-800/30 hover:bg-white"
                >
                  View my progress
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4 border-t border-orange-950/10 pt-6 sm:gap-x-10">
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-[#2e2420]">{courses.length}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">Courses</p>
                </div>
                <span aria-hidden="true" className="h-9 w-px bg-orange-950/10" />
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-[#2e2420]">{totalModules}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">Learning modules</p>
                </div>
                <span aria-hidden="true" className="h-9 w-px bg-orange-950/10" />
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-[#2e2420]">Always</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">Free for students</p>
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[560px] lg:ml-auto">
              <div aria-hidden="true" className="absolute -right-7 -top-8 h-36 w-36 rounded-full bg-[#f5e7da] blur-2xl" />
              <div aria-hidden="true" className="absolute -bottom-8 -left-5 h-32 w-32 rounded-full bg-[#f1dcb7] blur-2xl" />
              <div className="relative aspect-[1.12/1] overflow-hidden rounded-[2rem] bg-[#f5e7da] shadow-[0_30px_90px_-40px_rgba(184, 92, 56,0.28)] sm:rounded-[2.5rem]">
                {}
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=85"
                  alt="University students learning together around a laptop"
                  fetchPriority="high"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2e2420]/45 via-transparent to-white/10" />
                <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-3.5 py-2 text-[11px] font-bold text-[#88432c] shadow-lg backdrop-blur-md sm:left-7 sm:top-7">
                  <span className="h-2 w-2 rounded-full bg-[#d78d69]" />
                  Your learning journey, in focus
                </div>
                <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-xl backdrop-blur-lg sm:bottom-7 sm:left-7 sm:right-7 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fcf1e8] text-[#a45232]">
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Small steps. Real progress.</p>
                        <p className="mt-0.5 text-xs text-slate-500">Learn at your own pace</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#fcf1e8] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#a45232]">You’ve got this</span>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full w-[68%] rounded-full bg-[#cf7958]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-orange-950/[0.08] bg-white/45">
            <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-3 px-5 py-4 sm:px-8 md:flex-row lg:px-12">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Built for the learning community at</span>
              <div className="flex items-center gap-3">
                <PartnerLogos size="sm" showDivider={false} />
                <span className="hidden text-xs font-semibold text-slate-600 sm:block">Punjab Tianjin University of Technology</span>
              </div>
            </div>
          </div>
        </section>

        {lastVisit && (
          <section className="border-b border-slate-200/80 bg-white">
            <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
              <div className="flex items-center gap-3">
                {streak > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">
                    <Flame className="h-4 w-4" /> {streak}-day streak
                  </span>
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#cf7958]">Continue learning</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-800">
                    {lastVisit.title}
                    {lastVisit.courseTitle && <span className="font-normal text-slate-500"> · {lastVisit.courseTitle}</span>}
                  </p>
                </div>
              </div>
              <Link href={`/course/${lastVisit.courseId}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#a45232] hover:text-[#6f3024]">
                Resume course <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}

        <section id="catalogue" className="catalogue-section scroll-mt-24 py-16 sm:py-20">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.19em] text-[#b85c38]">Your next chapter</span>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#2e2420] sm:text-4xl">Find your course</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Good learning starts with one interesting subject. Pick up where curiosity takes you.</p>
              </div>
              <span className="text-sm font-semibold text-slate-500">{filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'} to explore</span>
            </div>

            <div className="mt-7 md:hidden">
              <label className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Search aria-hidden="true" className="h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  aria-label="Search courses"
                  placeholder="Search courses and subjects"
                  value={searchQuery}
                  onChange={(event) => updateSearch(event.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            <div className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Filter courses by subject">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category);
                    setCurrentPage(1);
                  }}
                  aria-pressed={selectedCategory === category}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${
                    selectedCategory === category
                      ? 'border-[#88432c] bg-[#88432c] text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-orange-800/30 hover:text-[#88432c]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="h-[340px] animate-pulse rounded-3xl bg-white shadow-sm" />
                ))}
              </div>
            ) : loadError ? (
              <div role="alert" className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm font-medium text-red-800">
                {loadError}
              </div>
            ) : courses.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center">
                <Layers3 className="mx-auto h-7 w-7 text-[#b85c38]" />
                <h3 className="mt-3 text-base font-semibold text-slate-800">Courses are getting ready</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  There are no published courses yet. Check back soon, or sign in if you manage course content.
                </p>
                <Link
                  href={user?.role === 'ADMIN' ? '/admin' : '/login'}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#88432c] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#6f3024]"
                >
                  {user?.role === 'ADMIN' ? 'Open admin portal' : 'Admin sign in'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : paginatedCourses.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center">
                <Search className="mx-auto h-6 w-6 text-slate-400" />
                <p className="mt-3 text-sm font-semibold text-slate-700">No courses match that search yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('All');
                    updateSearch('');
                  }}
                  className="mt-2 text-xs font-bold text-[#a45232] hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedCourses.map((course) => {
                  const moduleCount = moduleCounts[course.id] || course.module_count || 0;
                  const done = userProgressData[course.id]?.length || 0;
                  const percentage = moduleCount > 0 ? Math.min(100, Math.round((done / moduleCount) * 100)) : 0;
                  const imageId = CATEGORY_IMAGES[course.category] || CATEGORY_IMAGES['Computer Science'];
                  const imageUrl = `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=900&q=80`;

                  return (
                    <article key={course.id} className="course-card group flex min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_-20px_rgba(90,55,37,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-25px_rgba(90,55,37,0.2)]">
                      <div className="course-image relative h-48 overflow-hidden bg-[#fcf1e8]">
                        {}
                        <img
                          src={imageUrl}
                          alt={`${course.category} course`}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#2e2420]/45 via-transparent to-transparent" />
                        <span className="absolute bottom-4 left-4 rounded-full border border-white/40 bg-white/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#6f3024] backdrop-blur">
                          {course.category || 'University course'}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-5 sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#b85c38]">{course.code}</span>
                          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <Clock3 className="h-3.5 w-3.5" /> Self-paced
                          </span>
                        </div>
                        <h3 className="mt-2 min-h-[3.5rem] text-lg font-semibold leading-7 tracking-[-0.02em] text-slate-800">{course.title}</h3>
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                          <Layers3 className="h-4 w-4 text-[#b85c38]" />
                          {moduleCount} learning {moduleCount === 1 ? 'module' : 'modules'}
                        </div>
                        <div className="mt-4">
                          <div className="mb-1.5 flex justify-between text-[10px] font-semibold text-slate-400">
                            <span>{done} of {moduleCount} completed</span><span>{percentage}%</span>
                          </div>
                          <div
                            className="h-1.5 overflow-hidden rounded-full bg-slate-100"
                            role="progressbar"
                            aria-label={`${course.title} progress`}
                            aria-valuenow={percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div className="h-full rounded-full bg-[#cf7958] transition-all" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                        <Link
                          href={`/course/${course.id}`}
                          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#f5e7da] bg-[#fcf1e8] px-4 py-3 text-xs font-bold text-[#a45232] transition group-hover:border-[#88432c] group-hover:bg-[#88432c] group-hover:text-white"
                        >
                          Explore course <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <nav className="mt-9 flex items-center justify-center gap-2" aria-label="Course pages">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-2 text-xs font-semibold text-slate-500">Page {currentPage} of {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"
                >
                  Next
                </button>
              </nav>
            )}
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.19em] text-[#b85c38]">A little help goes a long way</span>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#2e2420] sm:text-4xl">Everything you need to learn with confidence</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">Thoughtful tools to help you understand your course, practise what you know and celebrate how far you’ve come.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <article key={feature.title} className="feature-card rounded-3xl border border-slate-200/80 bg-[#fdfefd] p-6 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-950/[0.05]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${feature.color}14`, color: feature.color }}>
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-800">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="how-it-works py-16 text-white sm:py-20">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
            <div className="mx-auto mb-10 max-w-xl text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.19em] text-[#f2dac7]">A simple rhythm</span>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Learn your way, step by step</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['01', 'Choose a course', 'Find a subject that fits what you’re learning.'],
                ['02', 'Explore each module', 'Work through clear, organised course notes.'],
                ['03', 'Get a helping hand', 'Ask the AI tutor or make a quick summary.'],
                ['04', 'Build your confidence', 'Practise with quizzes and track your progress.'],
              ].map(([number, title, description]) => (
                <article key={number} className="rounded-2xl border border-white/10 bg-white/[0.055] p-5">
                  <span className="font-mono text-xs font-bold tracking-widest text-[#f2dac7]">{number}</span>
                  <h3 className="mt-5 text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <div className="mb-8 text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.19em] text-[#b85c38]">Good to know</span>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#2e2420]">A few common questions</h2>
            </div>
            <div className="divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white px-5 sm:px-7">
              {[
                ['Do I need an account?', 'No. You can explore course notes, use the study tools and take quizzes without signing up. Your learning progress is saved on your device.'],
                ['What does the AI tutor use to answer?', 'The tutor uses the notes for the module you are studying to keep answers connected to your course material.'],
                ['Can I use notes offline?', 'You can print a module or save it as a PDF using the print option on the course page.'],
                ['Who maintains the course content?', 'Course material is added and reviewed by the CampusNotes administrators for the PTUT and ASTC learning community.'],
              ].map(([question, answer]) => (
                <details key={question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-800">
                    {question}
                    <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fcf1e8] text-lg font-normal text-[#a45232] transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{answer}</p>
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
