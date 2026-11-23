
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  HelpCircle,
  ChevronRight,
  CheckCircle,
  Copy,
  RefreshCw,
  AlertTriangle,
  Bookmark,
  Download,
  Clock
} from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import TutorChat from '@/components/TutorChat';
import ModuleIllustration from '@/components/ModuleIllustration';
import { track } from '@/lib/track';
import { supabase } from '@/lib/supabase';
import { bump, getLastVisit, isBookmarked, markStudyDay, setLastVisit, toggleBookmark } from '@/lib/progress';
import Link from 'next/link';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';

function markdownUrlTransform(url: string) {
  if (/^data:image\/(?:jpeg|png|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/i.test(url)) return url;
  return defaultUrlTransform(url);
}

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
    Record<string, { summary: string; source: string; notice?: string }>
  >({});
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const [summaryErrors, setSummaryErrors] = useState<Record<string, string>>({});
  const [summaryLoadingId, setSummaryLoadingId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  
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

  
  useEffect(() => {
    if (!activeModule) return;
    track('module_view', { courseId, moduleId: activeModule.id });
    markStudyDay();
    setLastVisit({ courseId, moduleId: String(activeModule.id), title: activeModule.title, courseTitle: course?.title });
    setBookmarked(isBookmarked(String(activeModule.id)));
  }, [activeModule?.id]); 

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
      const notice = res.headers.get('X-Summary-Notice') || undefined;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';

      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setSummaries((prev) => ({ ...prev, [moduleId]: { summary: text, source, notice } }));
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
        {}
        <img src="/logos/campusnotes-mark.svg" alt="" className="h-14 w-14 animate-pulse" />
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#b85c38] border-t-transparent"></div>
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
  const handleSaveAsPdf = async () => {
    if (!activeModule || pdfLoading) return;
    const source = document.querySelector<HTMLElement>('.course-content');
    if (!source || !source.textContent?.trim()) {
      setPdfError('The module content could not be found. Please reload and try again.');
      return;
    }

    setPdfLoading(true);
    setPdfError('');
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 17;
      const contentWidth = pageWidth - margin * 2;
      let cursorY = 22;

      const cleanPdfText = (text: string) => text
        .replace(/\u00a0/g, ' ')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/[—–]/g, '-')
        .replace(/[^\x20-\xFF]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const addTextBlock = (
        rawText: string,
        { size = 10, bold = false, indent = 0, after = 3 }: { size?: number; bold?: boolean; indent?: number; after?: number } = {},
      ) => {
        const text = cleanPdfText(rawText);
        if (!text) return;
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.setFontSize(size);
        pdf.setTextColor(43, 37, 33);
        const lines = pdf.splitTextToSize(text, contentWidth - indent);
        const lineHeight = size * 0.48;
        let lineIndex = 0;
        while (lineIndex < lines.length) {
          const availableLines = Math.floor((pageHeight - 18 - cursorY) / lineHeight);
          if (availableLines <= 0) {
            pdf.addPage();
            cursorY = 20;
            continue;
          }
          const pageLines = lines.slice(lineIndex, lineIndex + availableLines);
          pdf.text(pageLines, margin + indent, cursorY, { lineHeightFactor: 1.35 });
          cursorY += pageLines.length * lineHeight;
          lineIndex += pageLines.length;
          if (lineIndex < lines.length) {
            pdf.addPage();
            cursorY = 20;
          }
        }
        cursorY += after;
      };

      pdf.setProperties({ title: activeModule.title, subject: course?.title, author: 'CampusNotes' });
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(111, 48, 36);
      const titleLines = pdf.splitTextToSize(cleanPdfText(activeModule.title), contentWidth);
      pdf.text(titleLines, margin, cursorY);
      cursorY += titleLines.length * 9 + 2;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(105, 93, 84);
      pdf.text(cleanPdfText(`CampusNotes  ·  ${course?.title || 'University course'}`), margin, cursorY);
      cursorY += 6;
      pdf.setDrawColor(184, 92, 56);
      pdf.setLineWidth(0.7);
      pdf.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 8;

      const illustrationTitle = source.querySelector('figure figcaption p')?.textContent;
      if (illustrationTitle) {
        addTextBlock(`Visual guide: ${illustrationTitle}`, { size: 9, bold: true, after: 7 });
      }

      Array.from(source.children).forEach((element) => {
        const tag = element.tagName.toLowerCase();
        const text = element instanceof HTMLElement ? element.innerText : element.textContent || '';
        if (tag === 'figure') return;
        if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
          addTextBlock(text, { size: tag === 'h1' ? 16 : tag === 'h2' ? 13 : 11, bold: true, after: 4 });
        } else if (tag === 'ul' || tag === 'ol') {
          Array.from(element.children).forEach((item, index) => {
            addTextBlock(`${tag === 'ol' ? `${index + 1}.` : '-'} ${item.textContent || ''}`, { indent: 4, after: 2 });
          });
          cursorY += 2;
        } else if (tag === 'table') {
          Array.from((element as HTMLTableElement).rows).forEach((row) => {
            const cells = Array.from(row.cells).map((cell) => cell.innerText);
            addTextBlock(cells.join('  |  '), { size: 9, bold: row.querySelector('th') !== null, after: 2 });
          });
          cursorY += 3;
        } else if (tag === 'pre') {
          addTextBlock(text, { size: 9, indent: 3, after: 5 });
        } else if (tag === 'blockquote') {
          addTextBlock(text, { size: 10, indent: 5, after: 5 });
        } else if (tag === 'p') {
          addTextBlock(text, { after: 4 });
        }
      });

      const pageCount = pdf.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        pdf.setPage(page);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(120, 110, 102);
        pdf.text('CampusNotes  ·  Learn. Practise. Progress.', margin, pageHeight - 9);
        pdf.text(`${page} / ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
      }

      const filename = `${cleanTitle(activeModule.title)}.pdf`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-');
      const pdfBlob = pdf.output('blob');
      if (pdfBlob.size < 1000) throw new Error('Generated PDF is unexpectedly empty.');
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (error) {
      console.error('PDF generation failed:', error);
      setPdfError('Could not generate the PDF. Please reload this module and try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const isSummaryLoading =
    !!activeModule && summaryLoadingId === activeModule.id;

  return (
    <div className="course-reader relative flex min-h-screen flex-col bg-[#fbf8f3] font-sans">
      {showSuccessMsg && (
        <div role="status" className="fixed left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#88432c] px-6 py-3 font-semibold text-white shadow-lg">
          <CheckCircle className="h-5 w-5" /> Module Completed! Progress Saved.
        </div>
      )}

      <SiteHeader>
        <div className="hidden items-center gap-3 sm:flex">
          <span className="text-xs font-semibold text-slate-500">{completedModules.length}/{modules.length} done</span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#cf7958] transition-all duration-500" style={{ width: `${progressPercentage}%` }} /></div>
        </div>
        <Link href="/" className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-[#88432c]">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">All tutorials</span>
        </Link>
      </SiteHeader>

      <div className="flex w-full flex-1 flex-col md:flex-row">
        <aside className="course-sidebar w-full shrink-0 border-b border-slate-200 bg-[#f8f2ec] md:sticky md:top-[68px] md:h-[calc(100vh-68px)] md:w-[310px] md:overflow-y-auto md:border-b-0 md:border-r">
          <div className="px-5 pb-4 pt-6 sm:px-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#b85c38]">Course guide</p>
            <h2 className="mt-2 text-lg font-bold leading-6 tracking-[-0.02em] text-slate-900">{course?.title || 'Course'}</h2>
            <p className="mt-1.5 text-xs font-medium text-slate-500">{course?.course_code || course?.code || ''} <span className="px-1 text-slate-300">·</span> {modules.length} modules</p>
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-[10px] font-semibold text-slate-500">
                <span>Your progress</span><span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-[#cf7958] transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
              </div>
            </div>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto px-3 pb-4 md:max-h-none md:px-3">
            {modules.map((mod) => {
              const isActive = activeModule?.id === mod.id;
              const isCompleted = completedModules.includes(mod.id);
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => goTo(mod)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`flex w-full items-start justify-between gap-2 rounded-xl px-3.5 py-3 text-left text-[13px] leading-5 transition ${
                    isActive
                      ? 'bg-[#b85c38] font-semibold text-white shadow-sm shadow-orange-950/10'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <span className="flex min-w-0 gap-2.5">
                    <span className={`shrink-0 font-mono text-[10px] ${isActive ? 'text-orange-100' : 'text-slate-400'}`}>{String(mod.position).padStart(2, '0')}</span>
                    <span className="line-clamp-2">{cleanTitle(mod.title)}</span>
                  </span>
                  {isCompleted && <CheckCircle className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-[#cf7958]'}`} />}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:py-8 lg:px-10">
          <div className="mx-auto max-w-[920px]">
          {fetchError && <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{fetchError}</div>}

          <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Link href="/" className="transition hover:text-[#a45232]">Home</Link>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="max-w-[200px] truncate">{course?.title || 'Course'}</span>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="text-[#a45232]">Module {activeModule?.position}</span>
          </nav>

          <div className="rounded-3xl border border-slate-200/80 bg-white px-5 py-5 shadow-sm shadow-slate-900/[0.025] sm:px-7 sm:py-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#b85c38]">
                  Module {String(activeModule?.position || 1).padStart(2, '0')}
                </p>
                <h1 className="mt-2 text-[1.7rem] font-semibold leading-tight tracking-[-0.04em] text-slate-900 sm:text-3xl">
                  {activeModule ? cleanTitle(activeModule.title) : 'Choose a module'}
                </h1>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => prevMod && goTo(prevMod)}
                  disabled={!prevMod}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-orange-800/30 hover:text-[#a45232] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous module"
                  title="Previous module"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => nextMod && goTo(nextMod)}
                  disabled={!nextMod}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-orange-800/30 hover:text-[#a45232] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next module"
                  title="Next module"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {readingMinutes} min read <span className="text-slate-300">·</span> {wordCount} words
              {isCurrentModuleCompleted && <span className="ml-1 inline-flex items-center gap-1 font-semibold text-[#b85c38]"><CheckCircle className="h-3.5 w-3.5" /> Completed</span>}
            </p>
            <div className="no-print mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button onClick={handleGenerateSummary} disabled={summaryLoadingId !== null || !activeModule} className="inline-flex items-center gap-2 rounded-full bg-[#b85c38] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#88432c] disabled:opacity-50">
                <Sparkles className="h-4 w-4" />
                {isSummaryLoading ? 'Generating summary…' : currentSummary ? 'Regenerate summary' : 'AI summary'}
              </button>
              <button onClick={handleToggleBookmark} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold transition ${bookmarked ? 'border-[#f2dac7] bg-[#fcf1e8] text-[#a45232]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`} aria-pressed={bookmarked}>
                <Bookmark className="h-3.5 w-3.5" fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? 'Saved' : 'Save module'}
              </button>
              <button onClick={() => void handleSaveAsPdf()} disabled={pdfLoading} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                <Download className="h-3.5 w-3.5" /> {pdfLoading ? 'Preparing PDF…' : 'Download PDF'}
              </button>
            </div>
            {pdfError && <p className="no-print mt-2 text-xs font-semibold text-red-700" role="alert">{pdfError}</p>}
          </div>

            {(isSummaryLoading || currentSummary || currentSummaryError) && (
              <div className="print-exclude mt-5 overflow-hidden rounded-3xl border border-orange-900/10 bg-[#fcf1e8]">
                <div className="flex items-center justify-between gap-3 border-b border-orange-900/10 px-5 py-3.5 sm:px-6">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#b85c38] text-white"><Sparkles className="h-4 w-4" /></span>
                    AI Summary
                  </h2>
                  {currentSummary?.summary && !isSummaryLoading && (
                    <button onClick={handleCopySummary} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:text-[#a45232]">
                      <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>

                <div className="px-5 py-5 sm:px-6">
                  {isSummaryLoading && !currentSummary?.summary && (
                    <div className="space-y-2.5 animate-pulse">
                      <div className="h-3 w-full rounded bg-orange-100" />
                      <div className="h-3 w-11/12 rounded bg-orange-100" />
                      <div className="h-3 w-9/12 rounded bg-orange-100" />
                      <p className="pt-2 text-xs font-semibold text-orange-700">Reading this module and writing your summary...</p>
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
                      <span>{currentSummary.notice || <>The AI service did not respond, so this is a quick automatic summary. Press <b>Regenerate</b> to try the full AI summary again.</>}</span>
                    </div>
                  )}

                  {currentSummary?.summary && (
                    <div className={`prose-ai text-[14px] text-slate-700 ${isSummaryLoading ? 'cursor-blink' : ''}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentSummary.summary}</ReactMarkdown>
                    </div>
                  )}

                  {currentSummary?.summary && !isSummaryLoading && (
                    <button onClick={handleGenerateSummary} className="mt-4 flex items-center gap-1.5 text-xs font-bold text-orange-700 hover:text-orange-900">
                      <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                    </button>
                  )}
                </div>
              </div>
            )}

            <article className="course-content mt-5 min-h-[360px] rounded-3xl border border-slate-200/80 bg-white px-5 py-6 text-[15px] leading-7 text-slate-800 shadow-sm shadow-slate-900/[0.025] sm:px-9 sm:py-8">
              {activeModule?.content?.trim() ? (
                <>
                <ModuleIllustration title={cleanTitle(activeModule.title)} courseTitle={course?.title} />
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  urlTransform={markdownUrlTransform}
                  components={{
                    h1: ({ ...props }) => (
                      <h1
                        className="text-[24px] font-black text-slate-900 mt-8 mb-4 pb-3 border-b-2 border-orange-500"
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
                        className="text-[17px] font-bold text-orange-800 mt-5 mb-2"
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
                        className="list-disc space-y-2 my-4 text-slate-700 text-[15px] leading-7 ml-5 marker:text-[#b85c38]"
                        {...props}
                      />
                    ),
                    ol: ({ ...props }) => (
                      <ol
                        className="list-decimal space-y-2 my-4 text-slate-700 text-[15px] leading-7 ml-5 marker:font-black marker:text-[#b85c38]"
                        {...props}
                      />
                    ),
                    li: ({ ...props }) => (
                      <li className="pl-1 text-gray-700" {...props} />
                    ),
                    blockquote: ({ ...props }) => (
                      <blockquote
                        className="my-5 border-l-4 border-[#b85c38] bg-orange-50 px-5 py-4 text-gray-700 rounded-r-xl"
                        {...props}
                      />
                    ),
                    hr: ({ ...props }) => (
                      <hr className="my-7 border-0 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent" {...props} />
                    ),
                    table: ({ ...props }) => (
                      <div className="overflow-x-auto my-6 rounded-xl border-2 border-orange-200 shadow-sm">
                        <table
                          className="min-w-full border-collapse text-sm"
                          {...props}
                        />
                      </div>
                    ),
                    thead: ({ ...props }) => (
                      <thead className="bg-[#b85c38] text-white" {...props} />
                    ),
                    tbody: ({ ...props }) => (
                      <tbody className="divide-y divide-orange-100 bg-white" {...props} />
                    ),
                    tr: ({ ...props }) => (
                      <tr className="even:bg-orange-50/40 hover:bg-orange-50 transition-colors" {...props} />
                    ),
                    th: ({ ...props }) => (
                      <th
                        className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider border-r border-orange-400/40 last:border-r-0"
                        {...props}
                      />
                    ),
                    td: ({ ...props }) => (
                      <td
                        className="px-4 py-3 text-[14px] text-slate-700 border-r border-orange-100 last:border-r-0 align-top"
                        {...props}
                      />
                    ),
                    a: ({ ...props }) => (
                      <a
                        className="font-bold text-[#88432c] underline decoration-orange-300 underline-offset-4 hover:text-orange-600"
                        target="_blank"
                        rel="noreferrer"
                        {...props}
                      />
                    ),
                    img: ({ ...props }) => (
                      <span className="my-7 block overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm">
                        <img
                          className="mx-auto max-h-[560px] w-full rounded-xl object-contain"
                          loading="lazy"
                          {...props}
                          alt={props.alt || ''}
                        />
                      </span>
                    ),
                    pre: ({ ...props }) => (
                      <pre
                        className="my-5 overflow-x-auto rounded-2xl border-2 border-orange-200 bg-[#f8f2ec] p-4 text-xs text-[#4b423b] shadow-sm"
                        {...props}
                      />
                    ),
                    code: ({ className, children, ...props }) => (
                      <code
                        className={`${className || ''} ${className ? 'font-mono' : 'rounded bg-orange-100 px-1.5 py-0.5 font-mono text-xs text-orange-900'}`}
                        {...props}
                      >
                        {children}
                      </code>
                    ),
                  }}
                >
                  {activeModule.content}
                </ReactMarkdown>
                </>
              ) : (
                <p className="text-gray-400">
                  {activeModule
                    ? 'No content uploaded for this module yet.'
                    : 'Select a module to view its content.'}
                </p>
              )}
            </article>

          <div className="no-print mt-5 flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.025] sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <button onClick={() => prevMod && goTo(prevMod)} disabled={!prevMod} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
              <ArrowLeft className="h-4 w-4" /> Previous module
            </button>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={handleMarkComplete} disabled={isCurrentModuleCompleted || !activeModule} className="inline-flex items-center gap-2 rounded-full bg-[#b85c38] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#88432c] disabled:cursor-not-allowed disabled:opacity-50">
                {isCurrentModuleCompleted ? <><CheckCircle className="h-4 w-4" /> Completed</> : 'Mark complete'}
              </button>
              <button onClick={() => router.push(`/quiz/${activeModule?.id ?? courseId}`)} disabled={!activeModule} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-orange-800/30 hover:text-[#a45232] disabled:opacity-50">
                <HelpCircle className="h-4 w-4" /> Test yourself (Quiz)
              </button>
              <button onClick={() => router.push(`/flashcards/${activeModule?.id ?? courseId}`)} disabled={!activeModule} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-orange-800/30 hover:text-[#a45232] disabled:opacity-50">
                <Sparkles className="h-4 w-4" /> Flashcards
              </button>
            </div>
            <button onClick={() => nextMod && goTo(nextMod)} disabled={!nextMod} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
              Next module <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          </div>
        </main>
      </div>

      {activeModule && <TutorChat key={String(activeModule.id)} moduleId={String(activeModule.id)} courseId={courseId} moduleTitle={cleanTitle(activeModule.title)} />}
      <SiteFooter />
    </div>
  );
}
