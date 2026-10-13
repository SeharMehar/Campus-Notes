// app/quiz/[id]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ArrowLeft, ArrowRight } from 'lucide-react';

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
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<AnswerRecord[]>([]);

  useEffect(() => {
    fetchQuizMCQs();
  }, [moduleId]);

  const fetchQuizMCQs = async () => {
    setLoading(true);
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('id, subject')
      .eq('module_id', moduleId)
      .single();

    if (quizData) {
      const { data: mcqData } = await supabase
        .from('mcqs')
        .select('*')
        .eq('quiz_id', quizData.id);

      if (mcqData && mcqData.length > 0) {
        setMcqs(mcqData);
      }
    }
    setLoading(false);
  };

  const currentMcq = mcqs[currentIndex] || {
    question: 'Which data structure follows the Last-In-First-Out (LIFO) order?',
    options: ['Queue', 'Stack', 'Binary tree', 'Hash table'],
    correct_option: 1,
    explanation: 'A Stack utilizes Last-In-First-Out (LIFO) order where the last element inserted is removed first.'
  };

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
  };

  if (loading) {
    return <div className="p-16 text-center text-xs text-teal-600 font-semibold">Loading Quiz Engine...</div>;
  }

  const totalQuestions = mcqs.length || 4;
  const incorrectCount = totalQuestions - score;
  const percentageScore = Math.round((score / totalQuestions) * 100);
  const progressPercentage = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col justify-between">
      <div>
        {/* Header Navigation with Back & Forward Controls */}
        <header className="border-b-2 border-teal-500/20 px-6 py-3 flex items-center justify-between bg-white shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 border border-teal-500/30 rounded-xl p-1 bg-teal-50/40">
              <button
                onClick={() => router.back()}
                title="Go Back"
                className="p-1.5 hover:bg-teal-100 rounded-lg text-teal-800 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.forward()}
                title="Go Forward"
                className="p-1.5 hover:bg-teal-100 rounded-lg text-gray-400 transition hover:text-teal-800"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl text-teal-600 tracking-tight">CampusNotes</span>
            </div>
          </div>

          <nav className="flex items-center gap-6 text-xs font-semibold text-gray-700">
            <Link href="/" className="hover:text-teal-600 font-bold">Courses</Link>
            <span className="hover:text-teal-600 cursor-pointer">My Progress</span>
            <Link href="/admin" className="hover:text-teal-600 font-bold">Admin</Link>
          </nav>
        </header>

        {quizCompleted ? (
          /* QUIZ RESULTS VIEW */
          <main className="max-w-4xl mx-auto px-6 py-8">
            <h1 className="text-xl font-black text-black mb-8 text-center sm:text-left">
              Quiz results: Data Structures
            </h1>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-8">
              <div className="flex flex-col items-center">
                <div className="w-44 h-44 rounded-full border-4 border-teal-500 flex items-center justify-center bg-teal-50/30 shadow-sm">
                  <span className="text-4xl font-black text-teal-800">{percentageScore}%</span>
                </div>
                <span className="text-xs font-semibold text-gray-600 mt-2">Your score</span>
              </div>

              <div className="flex-1 w-full">
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="border-2 border-teal-200 rounded-2xl p-4 text-center bg-teal-50/20">
                    <span className="text-3xl font-black text-black block mb-1">{totalQuestions}</span>
                    <span className="text-[11px] font-semibold text-gray-600">Total questions</span>
                  </div>

                  <div className="border-2 border-green-600 rounded-2xl p-4 text-center bg-green-50/30">
                    <span className="text-3xl font-black text-green-700 block mb-1">{score}</span>
                    <span className="text-[11px] font-semibold text-gray-600">Correct</span>
                  </div>

                  <div className="border-2 border-red-500 rounded-2xl p-4 text-center bg-red-50/30">
                    <span className="text-3xl font-black text-red-600 block mb-1">{incorrectCount}</span>
                    <span className="text-[11px] font-semibold text-gray-600">Incorrect</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 font-medium text-center">
                  Attempts on this quiz: 3 &nbsp;|&nbsp; Best score: {Math.max(percentageScore, 85)}%
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-sm font-extrabold text-black mb-3">Review your answers</h2>

              <div className="border-2 border-teal-500/20 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-teal-50 border-b-2 border-teal-200 font-bold text-teal-900">
                      <th className="p-3 border-r border-teal-200">Question</th>
                      <th className="p-3 border-r border-teal-200">Your answer</th>
                      <th className="p-3 border-r border-teal-200">Correct answer</th>
                      <th className="p-3 text-center">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-teal-100">
                    {(userAnswers.length > 0
                      ? userAnswers
                      : [
                          { question: 'Q1 Which structure uses LIFO?', userAnswer: 'Stack', correctAnswer: 'Stack', isCorrect: true },
                          { question: 'Q2 Time to access array element', userAnswer: 'O(n)', correctAnswer: 'O(1)', isCorrect: false },
                          { question: 'Q3 Which is not linear?', userAnswer: 'Tree', correctAnswer: 'Tree', isCorrect: true },
                          { question: 'Q4 Queue order', userAnswer: 'FIFO', correctAnswer: 'FIFO', isCorrect: true },
                        ]
                    ).map((row, idx) => (
                      <tr key={idx} className="hover:bg-teal-50/30 text-gray-800">
                        <td className="p-3 border-r border-teal-100 font-medium">{row.question}</td>
                        <td className="p-3 border-r border-teal-100">{row.userAnswer}</td>
                        <td className="p-3 border-r border-teal-100">{row.correctAnswer}</td>
                        <td className="p-3 text-center font-bold">
                          {row.isCorrect ? (
                            <span className="text-green-700">pass</span>
                          ) : (
                            <span className="text-red-600">fail</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleRetake}
                className="bg-teal-500 text-white border-2 border-teal-500 px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-teal-600 transition"
              >
                Retake quiz
              </button>
              <Link
                href={`/course/${moduleId}`}
                className="border-2 border-teal-500 text-teal-800 px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-teal-50 transition inline-block"
              >
                Back to course
              </Link>
            </div>
          </main>
        ) : (
          /* ACTIVE QUIZ VIEW */
          <main className="max-w-4xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-extrabold text-black">Data Structures: Quiz</h1>
              <Link
                href={`/course/${moduleId}`}
                className="border-2 border-teal-500 text-teal-800 px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-teal-50 transition"
              >
                Quit quiz
              </Link>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-6 gap-4">
              <span className="shrink-0 font-bold">
                Question {currentIndex + 1} of {totalQuestions}
              </span>

              <div className="flex-1 max-w-md bg-gray-200 h-2.5 rounded-full overflow-hidden border border-teal-300">
                <div
                  className="bg-teal-500 h-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>

              <span className="shrink-0 font-bold">
                Score so far: {score} / {answeredCount}
              </span>
            </div>

            <div className="border-2 border-teal-200 rounded-2xl p-6 bg-teal-50/30 text-sm font-extrabold text-black mb-6">
              {currentMcq.question}
            </div>

            <div className="space-y-3 mb-6">
              {currentMcq.options.map((optionText, idx) => {
                const optionLabel = String.fromCharCode(65 + idx);
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentMcq.correct_option;

                let optionStyle = 'border-2 border-teal-200/80 bg-white hover:bg-teal-50/50 text-black';
                let statusBadge = null;

                if (selectedOption !== null) {
                  if (isCorrect) {
                    optionStyle = 'border-2 border-green-600 bg-green-50 text-green-900 font-bold';
                    statusBadge = <span className="text-xs font-bold text-green-700">✓ Correct answer</span>;
                  } else if (isSelected) {
                    optionStyle = 'border-2 border-red-500 bg-red-50 text-red-900 font-bold';
                    statusBadge = <span className="text-xs font-bold text-red-600">— Incorrect</span>;
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={selectedOption !== null}
                    className={`w-full text-left p-4 rounded-2xl transition flex items-center justify-between text-xs font-semibold ${optionStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full border border-teal-400 flex items-center justify-center font-bold text-[11px] bg-white text-teal-800 shrink-0">
                        {optionLabel}
                      </span>
                      <span>{optionText}</span>
                    </div>
                    {statusBadge}
                  </button>
                );
              })}
            </div>

            {selectedOption !== null && (
              <div className="border-2 border-teal-300 rounded-2xl p-5 bg-teal-50/60 text-xs text-gray-800 leading-relaxed mb-6">
                <h3 className="font-extrabold text-teal-900 mb-2 text-xs">Explanation</h3>
                <p>{currentMcq.explanation}</p>
              </div>
            )}

            {selectedOption !== null && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextQuestion}
                  className="bg-teal-500 text-white border-2 border-teal-500 px-8 py-2.5 rounded-xl text-xs font-bold hover:bg-teal-600 transition"
                >
                  Next question &gt;
                </button>
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  );
}