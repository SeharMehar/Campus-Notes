
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
  CheckCircle
} from 'lucide-react';
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
    Record<string, { summary: string; keyTakeaways: string[] }>
  >({});

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
          setActiveModule(modulesData?.[0] || null);

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

  const handleMarkComplete = () => {
    if (!activeModule) return;

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

    setSummaryLoadingId(moduleId);
    setSummaryErrors((prev) => ({ ...prev, [moduleId]: '' }));

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error || 'Summary unavailable. Please refer to module text.'
        );
      }

      setSummaries((prev) => ({
        ...prev,
        [moduleId]: {
          summary: data.summary,
          keyTakeaways: data.keyTakeaways || [],
        },
      }));
    } catch (err) {
      setSummaryErrors((prev) => ({
        ...prev,
        [moduleId]:
          err instanceof Error
            ? err.message
            : 'Summary unavailable. Please refer to module text.',
      }));
    } finally {
      setSummaryLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#14b8a6] border-t-transparent"></div>
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

  const isSummaryLoading =
    !!activeModule && summaryLoadingId === activeModule.id;

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col relative">

      {showSuccessMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-100 border border-green-400 text-green-800 px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3 font-semibold animate-pulse z-50">
          <CheckCircle className="w-5 h-5" />
          Module Completed! Progress Saved.
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 text-gray-500 hover:text-[#334155] rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#14b8a6] text-white shadow-lg shadow-teal-200/40">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-[#14b8a6]">CampusNotes</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#14b8a6]">Academic Library</div>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
          <Link href="/" className="hover:text-[#14b8a6]">
            Home
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span>
            {course?.title || 'Course'} (
            {course?.course_code || course?.code || courseId})
          </span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#334155] font-semibold">
            Module {activeModule?.position || 1}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-600 hidden sm:inline">
            Progress: {completedModules.length} of {modules.length} modules
          </span>

          <div className="w-28 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#14b8a6] transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Sidebar */}
        <div className="md:col-span-4 lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-[calc(100vh-120px)] flex flex-col">
          <div className="px-3 py-2 border-b border-gray-100 mb-3 flex items-center justify-between">
            <h2 className="font-bold text-[#334155] text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#14b8a6]" />
              Course Modules
            </h2>

            <span className="text-xs bg-teal-50 text-[#14b8a6] px-2 py-0.5 rounded-full font-semibold">
              {modules.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {modules.map((mod) => {
              const isActive = activeModule?.id === mod.id;
              const isCompleted = completedModules.includes(mod.id);

              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod)}
                  className={`w-full text-left px-3.5 py-3 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-between gap-2 cursor-pointer border ${
                    isActive
                      ? 'bg-[#14b8a6] text-white border-[#14b8a6] shadow-sm'
                      : 'text-slate-600 border-transparent hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="line-clamp-2 pr-2">
                    {mod.position}. {cleanTitle(mod.title)}
                  </span>

                  {isCompleted && (
                    <CheckCircle
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-[#14b8a6]'
                      }`}
                    />
                  )}

                  {!isCompleted && isActive && (
                    <ChevronRight className="w-4 h-4 shrink-0 text-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Panel */}
        <div className="md:col-span-8 lg:col-span-9 bg-white rounded-xl border border-slate-200 p-8 shadow-sm flex flex-col justify-between min-h-[600px]">

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
              <h1 className="text-xl font-bold text-[#334155] tracking-tight leading-snug">
                Module {activeModule?.position}:
                {' '}
                {activeModule ? cleanTitle(activeModule.title) : ''}
              </h1>

              <button
                onClick={handleGenerateSummary}
                disabled={summaryLoadingId !== null || !activeModule}
                className="self-start sm:self-auto disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 bg-[#14b8a6] text-white text-xs font-bold rounded-lg hover:bg-[#0d9488] shadow-sm flex items-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4 text-white" />
                {isSummaryLoading
                  ? 'Generating...'
                  : currentSummary
                    ? 'Regenerate AI Summary'
                    : 'Generate AI Summary'}
              </button>
            </div>

            {/* Error message */}
            {fetchError && (
              <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {fetchError}
              </div>
            )}

            {/* AI Summary */}
            {(isSummaryLoading ||
              currentSummary ||
              currentSummaryError) && (
              <div className="mt-6 p-6 rounded-2xl border-2 border-teal-200 bg-teal-50/40">
                <h2 className="text-sm font-extrabold text-teal-900 flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-[#14b8a6]" />
                  AI Summary
                </h2>

                {isSummaryLoading && (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 bg-teal-100 rounded w-full" />
                    <div className="h-3 bg-teal-100 rounded w-11/12" />
                    <div className="h-3 bg-teal-100 rounded w-9/12" />
                    <p className="text-xs text-teal-700 font-semibold pt-2">
                      Reading this module and writing the summary...
                    </p>
                  </div>
                )}

                {!isSummaryLoading && currentSummaryError && (
                  <p className="text-sm text-red-600 font-semibold">
                    {currentSummaryError}
                  </p>
                )}

                {!isSummaryLoading && currentSummary && (
                  <>
                    <div className="text-sm text-gray-700 leading-relaxed mb-5 text-justify">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ ...props }) => (
                            <h1 className="flex items-center gap-3 text-center font-extrabold text-gray-900 text-base mt-5 mb-3 before:h-px before:flex-1 before:bg-teal-300 after:h-px after:flex-1 after:bg-teal-300" {...props} />
                          ),
                          h2: ({ ...props }) => (
                            <h2 className="flex items-center gap-3 text-center font-extrabold text-gray-900 text-base mt-5 mb-3 before:h-px before:flex-1 before:bg-teal-300 after:h-px after:flex-1 after:bg-teal-300" {...props} />
                          ),
                          h3: ({ ...props }) => (
                            <h3 className="flex items-center gap-3 text-center font-extrabold text-gray-900 text-sm mt-5 mb-3 before:h-px before:flex-1 before:bg-teal-300 after:h-px after:flex-1 after:bg-teal-300" {...props} />
                          ),
                          strong: ({ ...props }) => (
                            <strong className="font-extrabold text-gray-900" {...props} />
                          ),
                          p: ({ ...props }) => (
                            <p className="mb-3 text-justify" {...props} />
                          ),
                        }}
                      >
                        {currentSummary.summary}
                      </ReactMarkdown>
                    </div>

                    <h3 className="text-xs font-extrabold text-gray-700 uppercase mb-2">
                      Key takeaways
                    </h3>

                    <ol className="space-y-2">
                      {currentSummary.keyTakeaways.map((point, idx) => (
                        <li
                          key={idx}
                          className="flex gap-3 text-sm text-gray-700"
                        >
                          <span className="w-6 h-6 shrink-0 rounded-full bg-[#14b8a6] text-white text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            )}

            {/* Module Content */}
            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-slate-700 text-[14px] leading-6 min-h-[300px] shadow-sm">

              {activeModule?.content?.trim() ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ ...props }) => (
                      <h1
                        className="text-[19px] font-bold text-[#334155] mt-5 mb-3 pb-2 border-b-2 border-[#14b8a6]"
                        {...props}
                      />
                    ),
                    h2: ({ ...props }) => (
                      <h2
                        className="text-[17px] font-bold text-[#334155] mt-5 mb-2"
                        {...props}
                      />
                    ),
                    h3: ({ ...props }) => (
                      <h3
                        className="text-[15px] font-bold text-[#334155] mt-4 mb-2"
                        {...props}
                      />
                    ),
                    p: ({ ...props }) => (
                      <p
                        className="mb-3 leading-6 text-gray-700 text-[13px]"
                        {...props}
                      />
                    ),
                    ul: ({ ...props }) => (
                      <ul
                        className="list-disc space-y-2 my-4 text-gray-700 ml-5 marker:text-[#14b8a6]"
                        {...props}
                      />
                    ),
                    ol: ({ ...props }) => (
                      <ol
                        className="list-decimal space-y-2 my-4 text-[#334155] ml-5 marker:font-black marker:text-[#14b8a6]"
                        {...props}
                      />
                    ),
                    li: ({ ...props }) => (
                      <li className="pl-1 text-gray-700" {...props} />
                    ),
                    blockquote: ({ ...props }) => (
                      <blockquote
                        className="my-5 border-l-4 border-[#14b8a6] bg-teal-50 px-5 py-4 text-gray-700 rounded-r-xl"
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
                      <thead className="bg-[#14b8a6] text-white" {...props} />
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
                        className="px-4 py-3 text-sm text-gray-700 border-r border-teal-100 last:border-r-0 align-top"
                        {...props}
                      />
                    ),
                    a: ({ ...props }) => (
                      <a
                        className="font-bold text-[#0f766e] underline decoration-teal-300 underline-offset-4 hover:text-teal-600"
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
          </div>

          {/* Action Buttons */}
          <div className="pt-8 mt-8 border-t border-gray-100 flex justify-end gap-4">
            <button
              onClick={handleMarkComplete}
              disabled={isCurrentModuleCompleted || !activeModule}
              className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                isCurrentModuleCompleted
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                  : 'bg-[#14b8a6] text-white hover:bg-[#0d9488] border-2 border-[#14b8a6] cursor-pointer'
              }`}
            >
              {isCurrentModuleCompleted ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Completed
                </>
              ) : (
                'Mark as Complete'
              )}
            </button>

            <button
              onClick={() =>
                router.push(`/quiz/${activeModule?.id ?? courseId}`)
              }
              disabled={!activeModule}
              className="px-5 py-3 border-2 border-[#14b8a6] text-[#14b8a6] hover:bg-[#14b8a6] hover:text-white font-bold rounded-2xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <HelpCircle className="w-4 h-4" />
              Practice Module Quiz →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
