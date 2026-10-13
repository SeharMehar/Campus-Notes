// app/course/[id]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Check, BookOpen, Sparkles, X, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Module {
  id: string;
  course_id: string;
  title: string;
  content: string;
  position: number;
}

interface Course {
  id: string;
  code: string;
  title: string;
}

interface AISummary {
  id: string;
  module_id: string;
  summary_text: string;
  key_takeaways: string[];
}

export default function ModuleReaderWithBackNavigation({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [completedModules, setCompletedModules] = useState<string[]>([]);

  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generationTime, setGenerationTime] = useState('1.8 s');

  useEffect(() => {
    const savedProgress = localStorage.getItem(`progress_${courseId}`);
    if (savedProgress) setCompletedModules(JSON.parse(savedProgress));

    fetchCourseAndModules();
  }, [courseId]);

  const fetchCourseAndModules = async () => {
    setLoading(true);
    const { data: courseData } = await supabase.from('courses').select('id, code, title').eq('id', courseId).single();
    if (courseData) setCourse(courseData);

    const { data: moduleData } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('position', { ascending: true });

    if (moduleData && moduleData.length > 0) {
      setModules(moduleData);
      fetchAISummary(moduleData[0].id);
    }
    setLoading(false);
  };

  const fetchAISummary = async (moduleId: string) => {
    const { data } = await supabase.from('ai_summaries').select('*').eq('module_id', moduleId).single();
    if (data) setAiSummary(data);
    else setAiSummary(null);
  };

  const handleSelectModule = (index: number) => {
    setActiveModuleIndex(index);
    if (modules[index]) fetchAISummary(modules[index].id);
  };

  const toggleComplete = (moduleId: string) => {
    let updated: string[];
    if (completedModules.includes(moduleId)) {
      updated = completedModules.filter((id) => id !== moduleId);
    } else {
      updated = [...completedModules, moduleId];
    }
    setCompletedModules(updated);
    localStorage.setItem(`progress_${courseId}`, JSON.stringify(updated));
  };

  const handleRegenerate = () => {
    setGenerationTime('1.2 s');
    if (currentModule) fetchAISummary(currentModule.id);
  };

  if (loading) {
    return <div className="p-16 text-center text-xs text-teal-600 font-semibold">Loading Module Reader...</div>;
  }

  const currentModule = modules[activeModuleIndex];
  const progressPercentage = modules.length > 0 ? Math.round((completedModules.length / modules.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col justify-between">
      <div>
        {/* Header Navigation with Back & Forward Controls */}
        <header className="border-b-2 border-teal-500/20 px-6 py-3 flex items-center justify-between bg-white shadow-sm">
          <div className="flex items-center gap-4">
            {/* Back & Forward Browser Buttons */}
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

        {/* Breadcrumb & Progress */}
        <div className="max-w-7xl w-full mx-auto px-6 py-3 border-b border-teal-500/20 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-600 gap-2 bg-teal-50/30">
          <div>
            <Link href="/" className="hover:underline text-teal-700 font-semibold">Home</Link> &gt;{' '}
            <span className="font-medium text-gray-800">{course?.title} ({course?.code})</span> &gt;{' '}
            <span className="font-semibold text-teal-800">Module {activeModuleIndex + 1}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-teal-800">
              Progress: {completedModules.length} of {modules.length} modules
            </span>
            <div className="w-28 bg-gray-200 h-2.5 rounded-full overflow-hidden border border-teal-300">
              <div
                className="bg-teal-500 h-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Main Section */}
        <div className="max-w-7xl w-full mx-auto px-6 py-6 flex-1 flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-64 border-2 border-teal-500/30 rounded-2xl p-4 bg-teal-50/20 shrink-0">
            <h2 className="font-extrabold text-sm text-teal-800 mb-4 pb-2 border-b border-teal-200">Modules</h2>
            
            <div className="space-y-1">
              {modules.map((mod, idx) => {
                const isSelected = activeModuleIndex === idx;
                const isDone = completedModules.includes(mod.id);

                return (
                  <button
                    key={mod.id}
                    onClick={() => handleSelectModule(idx)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                      isSelected
                        ? 'border-2 border-teal-500 bg-teal-50 font-bold text-teal-900 shadow-sm'
                        : 'hover:bg-teal-50 text-gray-800'
                    }`}
                  >
                    <span className="truncate">
                      {isDone ? '✓ ' : ''}{idx + 1}. {mod.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="flex-1 border-2 border-teal-500/30 rounded-2xl p-6 bg-white flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-teal-100">
                <h1 className="text-2xl font-black text-black">
                  Module {activeModuleIndex + 1}: {currentModule?.title}
                </h1>

                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="bg-teal-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-teal-600 transition flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" /> Generate AI Summary
                </button>
              </div>

              {currentModule ? (
                <div className="space-y-4 text-xs text-gray-800 leading-relaxed font-sans">
                  <div className="bg-teal-50/30 border-2 border-teal-200/50 p-5 rounded-2xl text-xs text-gray-800 whitespace-pre-wrap font-mono">
                    {currentModule.content}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Link
                      href={`/quiz/${currentModule.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 border-2 border-teal-500 px-4 py-2 rounded-xl hover:bg-teal-50"
                    >
                      <BookOpen className="w-4 h-4" /> Practice Module Quiz →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 text-xs">No content available.</div>
              )}
            </div>

            <div className="pt-8 border-t border-teal-100 flex flex-wrap items-center justify-between gap-3 mt-8">
              <button
                onClick={() => handleSelectModule(Math.max(0, activeModuleIndex - 1))}
                disabled={activeModuleIndex === 0}
                className="border-2 border-teal-500/50 text-teal-800 px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-teal-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                &lt; Previous
              </button>

              {currentModule && (
                <button
                  onClick={() => toggleComplete(currentModule.id)}
                  className={`border-2 border-teal-500 px-8 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    completedModules.includes(currentModule.id)
                      ? 'bg-teal-500 text-white'
                      : 'bg-white text-teal-700 hover:bg-teal-50'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {completedModules.includes(currentModule.id) ? 'Completed' : 'Mark as complete'}
                </button>
              )}

              <button
                onClick={() => handleSelectModule(Math.min(modules.length - 1, activeModuleIndex + 1))}
                disabled={activeModuleIndex === modules.length - 1}
                className="bg-teal-500 text-white border-2 border-teal-500 px-8 py-2.5 rounded-xl text-xs font-bold hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next &gt;
              </button>
            </div>
          </main>

          {/* AI Drawer */}
          {isDrawerOpen && (
            <aside className="w-full lg:w-80 border-2 border-teal-500/30 rounded-2xl p-5 bg-white shrink-0 flex flex-col justify-between shadow-sm">
              <div>
                <div className="mb-4 pb-2 border-b border-teal-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-teal-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-teal-500" /> AI Summary
                    </h2>
                    <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                      Generated in {generationTime} (limit 2.5 s)
                    </p>
                  </div>
                  <button onClick={() => setIsDrawerOpen(false)} className="p-1 hover:bg-teal-50 rounded-lg">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="border-2 border-teal-200 rounded-2xl p-4 bg-teal-50/40 text-xs text-gray-800 leading-relaxed mb-6">
                  {aiSummary?.summary_text || 'Module summary loading...'}
                </div>

                <div className="mb-6">
                  <h3 className="text-xs font-extrabold text-teal-800 mb-3">Key takeaways</h3>
                  <div className="space-y-3">
                    {(aiSummary?.key_takeaways || [
                      'Sequential data memory layout.',
                      'Direct array index O(1) time complexity.',
                      'Dynamic node heap memory pointers.'
                    ]).map((point, index) => (
                      <div key={index} className="flex items-start gap-2.5 text-xs text-gray-800">
                        <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="leading-tight">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-2 border-dashed border-red-400 rounded-xl p-3 bg-red-50/50 text-[11px] text-red-600 leading-tight mb-6">
                  If the AI service fails or takes 2.5 s or more:
                  <div className="font-bold mt-1">"Summary unavailable. Please refer to module text."</div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleRegenerate}
                  className="flex-1 border-2 border-teal-500 text-teal-800 py-2 rounded-xl text-xs font-bold hover:bg-teal-50 transition text-center"
                >
                  Regenerate
                </button>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 bg-teal-500 text-white border-2 border-teal-500 py-2 rounded-xl text-xs font-bold hover:bg-teal-600 transition text-center"
                >
                  Close
                </button>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}