
'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import { track } from '@/lib/track';
import { addQuizRecord, markStudyDay } from '@/lib/progress';
import SiteFooter from '@/components/SiteFooter';

interface MCQ {
  id: string;
  question: string;
  options: string[];
  correct_option: number;
  explanation: string;
}

interface AnswerRecord {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

function isMCQ(value: unknown): value is MCQ {
  if (!value || typeof value !== 'object') return false;
  const question = value as Partial<MCQ>;
  return typeof question.question === 'string' &&
    Array.isArray(question.options) &&
    question.options.length === 4 &&
    question.options.every((option) => typeof option === 'string') &&
    typeof question.correct_option === 'number' &&
    Number.isInteger(question.correct_option) &&
    question.correct_option >= 0 &&
    question.correct_option < 4 &&
    typeof question.explanation === 'string';
}

export default function QuizWithBackNavigation({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const moduleId = resolvedParams.id;

  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quizError, setQuizError] = useState('');
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<AnswerRecord[]>([]);
  const [moduleInfo, setModuleInfo] = useState<{ title: string; courseId: string } | null>(null);
  const [attemptStats, setAttemptStats] = useState({ attempts: 0, best: 0 });

  const fetchQuizMCQs = useCallback(async () => {
    setLoading(true);
    setQuizError('');
    setModuleInfo(null);

    try {
      const { data: moduleData } = await supabase
        .from('modules')
        .select('title, course_id')
        .eq('id', moduleId)
        .maybeSingle();
      if (moduleData) setModuleInfo({ title: moduleData.title, courseId: moduleData.course_id });

      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId }),
      });
      const generated = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof generated.error === 'string' ? generated.error : 'Unable to load this quiz.');
      }

      const questions = Array.isArray(generated.questions) ? generated.questions.filter(isMCQ) : [];
      if (questions.length === 0) {
        setMcqs([]);
        setQuizError('This module does not have any valid quiz questions yet.');
        return;
      }

      setMcqs(questions.map((question: MCQ, index: number) => ({
        ...question,
        id: `${moduleId}-${index}`,
      })));
    } catch (error) {
      setMcqs([]);
      setQuizError(error instanceof Error ? error.message : 'Unable to load this quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    document.title = 'CampusNotes';
    const statsTimer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(`quiz_stats_${moduleId}`) || '{"attempts":0,"best":0}');
        setAttemptStats({ attempts: Number(saved.attempts) || 0, best: Number(saved.best) || 0 });
      } catch {
        setAttemptStats({ attempts: 0, best: 0 });
      }
    }, 0);
    const fetchTimer = window.setTimeout(() => { void fetchQuizMCQs(); }, 0);
    return () => {
      window.clearTimeout(statsTimer);
      window.clearTimeout(fetchTimer);
    };
  }, [fetchQuizMCQs, moduleId]);

  const currentMcq = mcqs[currentIndex];

  const handleSelectOption = (index: number) => {
    if (selectedOption !== null) return;

    setSelectedOption(index);
    setAnsweredCount((prev) => prev + 1);

    const isCorrect = index === currentMcq.correct_option;
    if (isCorrect) setScore((prev) => prev + 1);

    setUserAnswers((prev) => [
      ...prev,
      {
        question: currentMcq.question,
        userAnswer: currentMcq.options[index],
        correctAnswer: currentMcq.options[currentMcq.correct_option],
        isCorrect,
      },
    ]);
  };

  const handleNextQuestion = () => {
    if (currentIndex < mcqs.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      const finalPercent = Math.round((score / mcqs.length) * 100);
      try {
        const key = `quiz_stats_${moduleId}`;
        const previous = JSON.parse(localStorage.getItem(key) || '{"attempts":0,"best":0}');
        const next = {
          attempts: (previous.attempts || 0) + 1,
          best: Math.max(previous.best || 0, finalPercent),
        };
        localStorage.setItem(key, JSON.stringify(next));
        setAttemptStats(next);
      } catch {
        setAttemptStats({ attempts: 1, best: finalPercent });
      }
      if (moduleInfo?.courseId) {
        const progressKey = `progress_${moduleInfo.courseId}`;
        try {
          const completed = JSON.parse(localStorage.getItem(progressKey) || '[]');
          const completedIds = Array.isArray(completed) ? completed : [];
          if (!completedIds.includes(moduleId)) {
            localStorage.setItem(progressKey, JSON.stringify([...completedIds, moduleId]));
          }
        } catch {
          localStorage.setItem(progressKey, JSON.stringify([moduleId]));
        }
      }
      addQuizRecord({ moduleId: String(moduleId), title: moduleInfo?.title ?? 'Module', score: finalPercent, at: new Date().toISOString() });
      markStudyDay();
      track('quiz_completed', { courseId: moduleInfo?.courseId, moduleId, value: finalPercent });
      setQuizCompleted(true);
    }
  };

  const handleRetake = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setAnsweredCount(0);
    setUserAnswers([]);
    setQuizCompleted(false);
    void fetchQuizMCQs();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f1ece5]">
        {}
        <img src="/logos/campusnotes-mark.svg" alt="" className="h-14 w-14 animate-pulse" />
        <p className="text-sm font-semibold text-slate-600">Loading quiz...</p>
      </div>
    );
  }

  if (mcqs.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-white font-sans">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
          <div className="border-l-[5px] border-[#b85c38] bg-[#f1ece5] p-8">
            <h1 className="text-3xl font-bold text-slate-900">{quizError ? 'Unable to load quiz' : 'Quiz not available yet'}</h1>
            <p className="mt-3 text-base leading-7 text-slate-700">{quizError || 'This module quiz has not been added by an administrator. Go back to the tutorial and continue studying.'}</p>
            {quizError && <button type="button" onClick={() => void fetchQuizMCQs()} className="w3-btn mt-6 text-sm">Try again</button>}
            <Link href={moduleInfo ? `/course/${moduleInfo.courseId}` : '/'} className="w3-btn mt-6 text-sm">❮ Back to tutorial</Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const totalQuestions = mcqs.length;
  const incorrectCount = totalQuestions - score;
  const percentageScore = Math.round((score / totalQuestions) * 100);
  const progressPercentage = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  const circ = 2 * Math.PI * 54;
  const passed = percentageScore >= 50;

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-slate-800">
      <SiteHeader>
        <button onClick={() => router.back()} title="Go Back" className="rounded bg-white/10 p-2 text-white transition hover:bg-white/20"><ArrowLeft className="h-4 w-4" /></button>
        <Link href="/" className="hidden rounded px-3 py-2 text-xs font-bold text-white hover:bg-white/10 sm:block">All tutorials</Link>
      </SiteHeader>

      {}
      <div className="bg-[#f1ece5]">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#b85c38]">{quizCompleted ? 'Quiz results' : 'Test yourself'}</p>
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{moduleInfo?.title ?? 'Module'} Quiz</h1>
          </div>
          {!quizCompleted && (
            <Link href={moduleInfo ? `/course/${moduleInfo.courseId}` : '/'} className="w3-btn w3-btn-dark text-sm">✕ Quit quiz</Link>
          )}
        </div>
      </div>

      {quizCompleted ? (
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
          <div className="mb-8 flex flex-col items-center gap-8 md:flex-row">
            <div className="relative h-40 w-40 shrink-0">
              <svg viewBox="0 0 120 120" className="h-40 w-40 -rotate-90">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#f1ece5" strokeWidth="12" />
                <circle cx="60" cy="60" r="54" fill="none" stroke={passed ? '#b85c38' : '#ea2027'} strokeWidth="12" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - percentageScore / 100)} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-900">{percentageScore}%</span>
                <span className="text-[11px] font-semibold text-slate-500">{passed ? 'Well done!' : 'Keep practising'}</span>
              </div>
            </div>
            <div className="w-full flex-1">
              <div className="mb-3 grid grid-cols-3 gap-3 text-center">
                <div className="bg-[#f1ece5] p-4"><span className="block text-3xl font-bold text-slate-900">{totalQuestions}</span><span className="text-xs font-semibold text-slate-600">Questions</span></div>
                <div className="border-b-4 border-[#b85c38] bg-[#f1ece5] p-4"><span className="block text-3xl font-bold text-[#b85c38]">{score}</span><span className="text-xs font-semibold text-slate-600">Correct</span></div>
                <div className="border-b-4 border-[#ea2027] bg-[#f1ece5] p-4"><span className="block text-3xl font-bold text-[#ea2027]">{incorrectCount}</span><span className="text-xs font-semibold text-slate-600">Incorrect</span></div>
              </div>
              <p className="text-xs font-medium text-slate-500">Attempts on this quiz: {attemptStats.attempts} | Best score: {attemptStats.best}%</p>
            </div>
          </div>

          <h2 className="mb-3 text-2xl font-bold text-slate-900">Review your answers</h2>
          <div className="mb-8 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[#b85c38] text-white">
                  <th className="border border-white/30 p-3">Question</th>
                  <th className="border border-white/30 p-3">Your answer</th>
                  <th className="border border-white/30 p-3">Correct answer</th>
                  <th className="border border-white/30 p-3 text-center">Result</th>
                </tr>
              </thead>
              <tbody>
                {userAnswers.map((row, idx) => (
                  <tr key={idx} className="even:bg-[#f4efe8]">
                    <td className="border border-slate-200 p-3 font-medium">{row.question}</td>
                    <td className="border border-slate-200 p-3">{row.userAnswer}</td>
                    <td className="border border-slate-200 p-3">{row.correctAnswer}</td>
                    <td className="border border-slate-200 p-3 text-center font-bold">
                      {row.isCorrect ? <span className="text-[#b85c38]">✔ Pass</span> : <span className="text-[#ea2027]">✘ Fail</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={handleRetake} className="w3-btn text-sm">↻ Retake quiz</button>
            <Link href={moduleInfo ? `/course/${moduleInfo.courseId}` : '/'} className="w3-btn w3-btn-dark text-sm">❮ Back to tutorial</Link>
          </div>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
          <div className="mb-6 flex items-center justify-between gap-4 text-sm font-semibold text-slate-700">
            <span className="shrink-0">Question {currentIndex + 1} of {totalQuestions}</span>
            <div className="h-2.5 max-w-md flex-1 overflow-hidden rounded-full bg-[#f1ece5]"><div className="h-full bg-[#b85c38] transition-all duration-300" style={{ width: `${progressPercentage}%` }} /></div>
            <span className="shrink-0">Score: {score} / {answeredCount}</span>
          </div>

          <h2 className="mb-6 text-2xl font-bold leading-9 text-slate-900">{currentMcq.question}</h2>

          <div className="mb-6 space-y-2.5">
            {currentMcq.options.map((optionText, idx) => {
              const optionLabel = String.fromCharCode(65 + idx);
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentMcq.correct_option;
              let style = 'bg-[#f1ece5] hover:bg-[#e7ded4] text-slate-800';
              let badge = null;
              if (selectedOption !== null) {
                if (isCorrect) { style = 'bg-[#b85c38] text-white'; badge = <span className="text-xs font-bold">✔ Correct</span>; }
                else if (isSelected) { style = 'bg-[#ea2027] text-white'; badge = <span className="text-xs font-bold">✘ Incorrect</span>; }
                else style = 'bg-[#f1ece5] text-slate-400';
              }
              return (
                <button key={idx} onClick={() => handleSelectOption(idx)} disabled={selectedOption !== null}
                  className={`flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-[15px] font-semibold transition ${style}`}>
                  <span className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-xs font-bold text-slate-800">{optionLabel}</span>
                    {optionText}
                  </span>
                  {badge}
                </button>
              );
            })}
          </div>

          {selectedOption !== null && (
            <div className="mb-6 border-l-[5px] border-[#b85c38] bg-[#f1ece5] p-5 text-[15px] leading-7 text-slate-800">
              <h3 className="mb-1 font-bold text-slate-900">Explanation</h3>
              <p>{currentMcq.explanation}</p>
            </div>
          )}

          {selectedOption !== null && (
            <div className="flex justify-end"><button onClick={handleNextQuestion} className="w3-btn px-7 text-sm">{currentIndex < totalQuestions - 1 ? 'Next question ❯' : 'Finish quiz ❯'}</button></div>
          )}
        </main>
      )}

      <SiteFooter />
    </div>
  );
}
