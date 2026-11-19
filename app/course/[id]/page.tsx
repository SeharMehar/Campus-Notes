
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  HelpCircle,
  ChevronRight,
  BookOpen,
  CheckCircle,
  Copy,
  RefreshCw,
  AlertTriangle,
  Bookmark,
  Printer,
  Clock
} from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import TutorChat from '@/components/TutorChat';
import { track } from '@/lib/track';
import { bump, getLastVisit, isBookmarked, markStudyDay, setLastVisit, toggleBookmark } from '@/lib/progress';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Supabase client - created only once
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Module {
  id: string;
  title: string;
  content: string | null;
  position: number;
}

interface Course {
  id: string;
  course_code?: string;
  code?: string;
  title: string;
  category?: string;
}

export default function CourseModulesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);

  const [summaries, setSummaries] = useState<
    Record<string, { summary: string; source: string }>
  >({});
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const [summaryErrors, setSummaryErrors] = useState<Record<string, string>>({});
  const [summaryLoadingId, setSummaryLoadingId] = useState<string | null>(null);

  // Fetch course and modules
  useEffect(() => {
    document.title = 'CampusNotes';
    let cancelled = false;

    async function fetchData() {
      if (!courseId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError('');

      try {
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .maybeSingle();

        if (courseError) {
          console.error('Course fetch error:', courseError);
        }

        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('*')
          .eq('course_id', courseId)
          .order('position', { ascending: true });

        if (modulesError) {
          console.error('Modules fetch error:', modulesError);
          throw modulesError;
        }

        if (!cancelled) {
          setCourse(courseData);
          setModules(modulesData || []);
          // open the module from a bookmark link (?module=ID), or resume where the student stopped
          const wanted = new URLSearchParams(window.location.search).get('module');
          const last = getLastVisit();
          const resumeId = wanted || (last && String(last.courseId) === String(courseId) ? String(last.moduleId) : null);
          const target = (modulesData || []).find((m: Module) => String(m.id) === resumeId);
          setActiveModule(target || modulesData?.[0] || null);

          if (!courseData) {
            console.warn('Course not found for ID:', courseId);
          }

          if (!modulesData || modulesData.length === 0) {
            setFetchError(
              'No modules found for this course. Please check the course ID and database.'
            );
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);

        if (!cancelled) {
          setFetchError(
            error instanceof Error
              ? error.message
              : 'Unable to load course modules.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const cleanTitle = (rawTitle: string) => {
    if (!rawTitle) return '';
    return rawTitle.replace(/^Module\s+\d+:\s*/i, '');
  };

  useEffect(() => {
    if (!courseId) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`progress_${courseId}`) || '[]');
      setCompletedModules(Array.isArray(saved) ? saved : []);
    } catch {
      setCompletedModules([]);
    }
  }, [courseId]);

  // every time a module is opened: analytics, "continue learning", study streak, bookmark state
  useEffect(() => {
    if (!activeModule) return;
    track('module_view', { courseId, moduleId: activeModule.id });
    markStudyDay();
    setLastVisit({ courseId, moduleId: String(activeModule.id), title: activeModule.title, courseTitle: course?.title });
    setBookmarked(isBookmarked(String(activeModule.id)));
  }, [activeModule?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleBookmark = () => {
    if (!activeModule) return;
    setBookmarked(
      toggleBookmark({ moduleId: String(activeModule.id), courseId, title: activeModule.title, courseTitle: course?.title })
    );
  };

  const handleMarkComplete = () => {
    if (!activeModule) return;
    if (!completedModules.includes(activeModule.id)) track('module_completed', { courseId, moduleId: activeModule.id });

    const next = completedModules.includes(activeModule.id)
      ? completedModules
      : [...completedModules, activeModule.id];
    setCompletedModules(next);
    localStorage.setItem(`progress_${courseId}`, JSON.stringify(next));

    setShowSuccessMsg(true);
    setTimeout(() => setShowSuccessMsg(false), 3000);
  };

  const handleGenerateSummary = async () => {
    if (!activeModule || summaryLoadingId) return;

    const moduleId = activeModule.id;
    const regenerate = !!summaries[moduleId];

    setSummaryLoadingId(moduleId);
    setSummaryErrors((prev) => ({ ...prev, [moduleId]: '' }));
    setSummaries((prev) => ({ ...prev, [moduleId]: { summary: '', source: 'ai' } }));

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, regenerate }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Summary unavailable. Please try again.');
      }

      const source = res.headers.get('X-Summary-Source') || 'ai';
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';

      // Show the text as it arrives, like ChatGPT / Gemini.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setSummaries((prev) => ({ ...prev, [moduleId]: { summary: text, source } }));
      }

      if (!text.trim()) throw new Error('Summary unavailable. Please try again.');
      if (source !== 'fallback') {
        track('summary_generated', { courseId, moduleId, meta: { source } });
        bump('summaries');
      }
    } catch (err) {
      setSummaries((prev) => {
        const next = { ...prev };
        if (!next[moduleId]?.summary) delete next[moduleId];
        return next;
      });
      setSummaryErrors((prev) => ({
        ...prev,
        [moduleId]: err instanceof Error ? err.message : 'Summary unavailable. Please try again.',
      }));
    } finally {
      setSummaryLoadingId(null);
    }
  };

  const handleCopySummary = async () => {
    if (!activeModule) return;
    try {
      await navigator.clipboard.writeText(summaries[activeModule.id]?.summary || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/campusnotes.svg" alt="" className="h-14 w-14 animate-pulse" />
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#04AA6D] border-t-transparent"></div>
      </div>
    );
  }

  const isCurrentModuleCompleted = activeModule
    ? completedModules.includes(activeModule.id)
    : false;

  const progressPercentage =
    modules.length > 0
      ? (completedModules.length / modules.length) * 100
      : 0;

  const currentSummary = activeModule
    ? summaries[activeModule.id]
    : undefined;

  const currentSummaryError = activeModule
    ? summaryErrors[activeModule.id]
    : '';

  const idx = activeModule ? modules.findIndex((m) => m.id === activeModule.id) : -1;
  const prevMod = idx > 0 ? modules[idx - 1] : null;
  const nextMod = idx >= 0 && idx < modules.length - 1 ? modules[idx + 1] : null;
  const wordCount = (activeModule?.content || '').trim().split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.round(wordCount / 200));
  const goTo = (m: Module) => { setActiveModule(m); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const isSummaryLoading =
    !!activeModule && summaryLoadingId === activeModule.id;

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col relative">
      {showSuccessMsg && (
        <div className="fixed top-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded bg-[#04AA6D] px-6 py-3 font-semibold text-white shadow-lg">
          <CheckCircle className="h-5 w-5" /> Module Completed! Progress Saved.
        </div>
      )}

      <SiteHeader>
        <div className="hidden items-center gap-3 sm:flex">
          <span className="text-xs font-semibold text-slate-300">{completedModules.length}/{modules.length} done</span>
          <div className="h-2 w-28 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-[#04AA6D] transition-all duration-500" style={{ width: `${progressPercentage}%` }} /></div>
        </div>
        <Link href="/" className="flex items-center gap-1.5 rounded bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">All tutorials</span>
        </Link>
      </SiteHeader>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col md:flex-row">
        {/* LEFT SIDEBAR (W3Schools style) */}
        <aside className="w-full shrink-0 bg-[#E7E9EB] md:sticky md:top-[62px] md:h-[calc(100vh-62px)] md:w-72 md:overflow-y-auto">
          <div className="px-4 pb-2 pt-5">
            <h2 className="text-xl font-bold leading-6 text-slate-900">{course?.title || 'Course'}</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">{course?.course_code || course?.code || ''} · {modules.length} modules</p>
          </div>
          <div className="max-h-64 overflow-y-auto pb-3 md:max-h-none">
            {modules.map((mod) => {
              const isActive = activeModule?.id === mod.id;
              const isCompleted = completedModules.includes(mod.id);
              return (
                <button key={mod.id} onClick={() => goTo(mod)}
                  className={`flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-[15px] transition ${isActive ? 'bg-[#04AA6D] font-semibold text-white' : 'text-slate-800 hover:bg-white'}`}>
                  <span className="line-clamp-2">{mod.position}. {cleanTitle(mod.title)}</span>
                  {isCompleted && <CheckCircle className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-[#04AA6D]'}`} />}
                </button>
              );
            })}
          </div>
        </aside>

        {/* MAIN */}
        <main className="min-w-0 flex-1 px-5 py-6 md:px-10">
          {fetchError && <div className="mb-4 border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">{fetchError}</div>}

          <div className="mb-1 text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-[#04AA6D]">Home</Link> ❯ {course?.title || 'Course'} ❯ Module {activeModule?.position}
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
              {activeModule ? cleanTitle(activeModule.title) : ''}
            </h1>
            <div className="flex gap-2">
              <button onClick={() => prevMod && goTo(prevMod)} disabled={!prevMod} className="w3-btn w3-btn-dark text-sm">❮ Previous</button>
              <button onClick={() => nextMod && goTo(nextMod)} disabled={!nextMod} className="w3-btn text-sm">Next ❯</button>
            </div>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Clock className="h-3.5 w-3.5" /> {readingMinutes} min read · {wordCount} words
          </p>
          <hr className="my-4 border-slate-200" />

          <div className="no-print flex flex-wrap gap-2">
            <button onClick={handleGenerateSummary} disabled={summaryLoadingId !== null || !activeModule} className="w3-btn text-sm">
              <Sparkles className="h-4 w-4" />
              {isSummaryLoading ? 'Generating...' : currentSummary ? 'Regenerate AI Summary' : 'Generate AI Summary'}
            </button>
            <button onClick={handleToggleBookmark} className={`w3-btn text-sm ${bookmarked ? '' : 'w3-btn-dark'}`} aria-pressed={bookmarked}>
              <Bookmark className="h-4 w-4" fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? 'Saved' : 'Save'}
            </button>
            <button onClick={() => window.print()} className="w3-btn w3-btn-dark text-sm"><Printer className="h-4 w-4" /> Print / PDF</button>
          </div>

            {/* AI Summary */}
            {(isSummaryLoading || currentSummary || currentSummaryError) && (
              <div className="mt-5 overflow-hidden border-l-[5px] border-[#04AA6D] bg-[#E7E9EB]">
                <div className="flex items-center justify-between gap-3 border-b border-slate-300 bg-[#d8dbdd] px-6 py-3.5">
                  <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-teal-500 text-white"><Sparkles className="h-4 w-4" /></span>
                    AI Summary
                  </h2>
                  {currentSummary?.summary && !isSummaryLoading && (
                    <button onClick={handleCopySummary} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-teal-50">
                      <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>

                <div className="px-6 py-5">
                  {isSummaryLoading && !currentSummary?.summary && (
                    <div className="space-y-2.5 animate-pulse">
                      <div className="h-3 w-full rounded bg-teal-100" />
                      <div className="h-3 w-11/12 rounded bg-teal-100" />
                      <div className="h-3 w-9/12 rounded bg-teal-100" />
                      <p className="pt-2 text-xs font-semibold text-teal-700">Reading this module and writing your summary...</p>
                    </div>
                  )}

                  {currentSummaryError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {currentSummaryError}
                    </div>
                  )}

                  {currentSummary?.source === 'fallback' && !isSummaryLoading && (
                    <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>The AI service did not respond, so this is a quick automatic summary. Press <b>Regenerate</b> to try the full AI summary again.</span>
                    </div>
                  )}

                  {currentSummary?.summary && (
                    <div className={`prose-ai text-[14px] text-slate-700 ${isSummaryLoading ? 'cursor-blink' : ''}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentSummary.summary}</ReactMarkdown>
                    </div>
                  )}

                  {currentSummary?.summary && !isSummaryLoading && (
                    <button onClick={handleGenerateSummary} className="mt-4 flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900">
                      <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Module Content */}
            <div className="mt-6 text-slate-800 text-[15px] leading-7 min-h-[300px]">

              {activeModule?.content?.trim() ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ ...props }) => (
                      <h1
                        className="text-[24px] font-black text-slate-900 mt-8 mb-4 pb-3 border-b-2 border-teal-500"
                        {...props}
                      />
                    ),
                    h2: ({ ...props }) => (
                      <h2
                        className="text-[20px] font-extrabold text-slate-900 mt-7 mb-3"
                        {...props}
                      />
                    ),
                    h3: ({ ...props }) => (
                      <h3
                        className="text-[17px] font-bold text-teal-800 mt-5 mb-2"
                        {...props}
                      />
                    ),
                    p: ({ ...props }) => (
                      <p
                        className="mb-4 leading-7 text-slate-700 text-[15px]"
                        {...props}
                      />
                    ),
                    ul: ({ ...props }) => (
                      <ul
                        className="list-disc space-y-2 my-4 text-slate-700 text-[15px] leading-7 ml-5 marker:text-[#04AA6D]"
                        {...props}
                      />
                    ),
                    ol: ({ ...props }) => (
                      <ol
                        className="list-decimal space-y-2 my-4 text-slate-700 text-[15px] leading-7 ml-5 marker:font-black marker:text-[#04AA6D]"
                        {...props}
                      />
                    ),
                    li: ({ ...props }) => (
                      <li className="pl-1 text-gray-700" {...props} />
                    ),
                    blockquote: ({ ...props }) => (
                      <blockquote
                        className="my-5 border-l-4 border-[#04AA6D] bg-teal-50 px-5 py-4 text-gray-700 rounded-r-xl"
                        {...props}
                      />
                    ),
                    hr: ({ ...props }) => (
                      <hr className="my-7 border-0 h-px bg-gradient-to-r from-transparent via-teal-300 to-transparent" {...props} />
                    ),
                    table: ({ ...props }) => (
                      <div className="overflow-x-auto my-6 rounded-xl border-2 border-teal-200 shadow-sm">
                        <table
                          className="min-w-full border-collapse text-sm"
                          {...props}
                        />
                      </div>
                    ),
                    thead: ({ ...props }) => (
                      <thead className="bg-[#04AA6D] text-white" {...props} />
                    ),
                    tbody: ({ ...props }) => (
                      <tbody className="divide-y divide-teal-100 bg-white" {...props} />
                    ),
                    tr: ({ ...props }) => (
                      <tr className="even:bg-teal-50/40 hover:bg-teal-50 transition-colors" {...props} />
                    ),
                    th: ({ ...props }) => (
                      <th
                        className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider border-r border-teal-400/40 last:border-r-0"
                        {...props}
                      />
                    ),
                    td: ({ ...props }) => (
                      <td
                        className="px-4 py-3 text-[14px] text-slate-700 border-r border-teal-100 last:border-r-0 align-top"
                        {...props}
                      />
                    ),
                    a: ({ ...props }) => (
                      <a
                        className="font-bold text-[#047a50] underline decoration-teal-300 underline-offset-4 hover:text-teal-600"
                        target="_blank"
                        rel="noreferrer"
                        {...props}
                      />
                    ),
                    img: ({ ...props }) => (
                      <span className="block my-6 overflow-hidden rounded-2xl border-2 border-teal-100 bg-white p-2 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="max-h-[520px] w-full object-contain rounded-xl"
                          {...props}
                        />
                      </span>
                    ),
                    pre: ({ ...props }) => (
                      <pre
                        className="my-5 overflow-x-auto rounded-2xl border-2 border-teal-200 bg-[#f4fffd] p-4 text-xs text-[#334155] shadow-sm"
                        {...props}
                      />
                    ),
                    code: ({ className, children, ...props }) => (
                      <code
                        className={`${className || ''} ${className ? 'font-mono' : 'rounded bg-teal-100 px-1.5 py-0.5 font-mono text-xs text-teal-900'}`}
                        {...props}
                      >
                        {children}
                      </code>
                    ),
                  }}
                >
                  {activeModule.content}
                </ReactMarkdown>
              ) : (
                <p className="text-gray-400">
                  {activeModule
                    ? 'No content uploaded for this module yet.'
                    : 'Select a module to view its content.'}
                </p>
              )}
            </div>

          <hr className="my-8 border-slate-200" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button onClick={() => prevMod && goTo(prevMod)} disabled={!prevMod} className="w3-btn w3-btn-dark text-sm">❮ Previous</button>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleMarkComplete} disabled={isCurrentModuleCompleted || !activeModule} className="w3-btn text-sm">
                {isCurrentModuleCompleted ? <><CheckCircle className="h-4 w-4" /> Completed</> : 'Mark as Complete'}
              </button>
              <button onClick={() => router.push(`/quiz/${activeModule?.id ?? courseId}`)} disabled={!activeModule} className="w3-btn w3-btn-dark text-sm">
                <HelpCircle className="h-4 w-4" /> Test yourself (Quiz)
              </button>
              <button onClick={() => router.push(`/flashcards/${activeModule?.id ?? courseId}`)} disabled={!activeModule} className="w3-btn w3-btn-dark text-sm">
                <Sparkles className="h-4 w-4" /> Flashcards
              </button>
            </div>
            <button onClick={() => nextMod && goTo(nextMod)} disabled={!nextMod} className="w3-btn text-sm">Next ❯</button>
          </div>
        </main>
      </div>

      {activeModule && <TutorChat key={String(activeModule.id)} moduleId={String(activeModule.id)} courseId={courseId} moduleTitle={cleanTitle(activeModule.title)} />}
      <SiteFooter />
    </div>
  );
}
