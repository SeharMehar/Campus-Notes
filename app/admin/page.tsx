// app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ArrowLeft, ArrowRight, Layers, FileText, HelpCircle, LayoutDashboard, Plus, Trash2 } from 'lucide-react';

interface Course {
  id: string;
  code: string;
  title: string;
  university?: string;
  category?: string;
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  content?: string;
  position?: number;
}

interface MCQ {
  id: string;
  quiz_id: string;
  question: string;
  options: string[];
  correct_option: number;
  explanation: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('admin@ptut');

  // Sidebar Active Tab State: 'Dashboard' | 'Courses' | 'Modules' | 'MCQ Banks'
  const [activeTab, setActiveTab] = useState('Courses');

  // Core Data States
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);

  // Selection States
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [quizId, setQuizId] = useState<string>('');

  // Course Form States
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCategory, setCourseCategory] = useState('Computer Science');
  const [courseUniversity, setCourseUniversity] = useState('PTUT');

  // Module Form States
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleContent, setModuleContent] = useState('');

  // MCQ Form States
  const [showMcqForm, setShowMcqForm] = useState(false);
  const [editingMcqId, setEditingMcqId] = useState<string | null>(null);
  const [mcqQuestion, setMcqQuestion] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctOption, setCorrectOption] = useState<number>(0);
  const [explanation, setExplanation] = useState('');

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 3500);
  };

  useEffect(() => {
    document.title = 'CampusNotes';
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      setIsAdmin(false);
      return;
    }

    try {
      const parsed = JSON.parse(savedUser);
      if (parsed.role !== 'ADMIN') {
        setIsAdmin(false);
        return;
      }
      setUserEmail(parsed.email || 'admin@ptut.com');
      setIsAdmin(true);
      fetchCourses();
    } catch {
      localStorage.removeItem('user');
      setIsAdmin(false);
    }
  }, []);

  // Fetch Courses from Supabase
  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setCourses(data);
      if (!selectedCourseId) {
        setSelectedCourseId(data[0].id);
        fetchModules(data[0].id);
      }
    } else {
      setCourses([]);
    }
  };

  // Fetch Modules based on Selected Course
  const fetchModules = async (courseId: string) => {
    setSelectedCourseId(courseId);
    const { data } = await supabase.from('modules').select('*').eq('course_id', courseId).order('position', { ascending: true });
    if (data && data.length > 0) {
      setModules(data);
      setSelectedModuleId(data[0].id);
      fetchQuizAndMcqs(data[0].id);
    } else {
      setModules([]);
      setSelectedModuleId('');
      setMcqs([]);
    }
  };

  // Fetch Quiz & MCQs based on Selected Module
  const fetchQuizAndMcqs = async (moduleId: string) => {
    setSelectedModuleId(moduleId);
    try {
      const response = await fetch(`/api/admin/mcqs?moduleId=${encodeURIComponent(moduleId)}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load MCQs.');
      setQuizId(result.quizId || '');
      setMcqs(Array.isArray(result.mcqs) ? result.mcqs : []);
    } catch (error) {
      setQuizId('');
      setMcqs([]);
      showNotice(error instanceof Error ? error.message : 'Unable to load MCQs.', 'error');
    }
  };

  // --- ACTIONS ---

  // 1. Add New Course
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode || !courseTitle) return;
    setLoading(true);

    const normalizedCode = courseCode.trim().toUpperCase();
    const safeBase = normalizedCode.replace(/[^A-Z0-9]/g, '') || `COURSE`;
    let courseId = safeBase;
    const { data: existingCourse } = await supabase.from('courses').select('id').eq('code', normalizedCode).maybeSingle();
    if (existingCourse) courseId = `${safeBase}-${Date.now()}`;

    const { data, error } = await supabase.from('courses').insert([
      {
        id: courseId,
        code: normalizedCode,
        title: courseTitle.trim(),
        category: courseCategory,
      },
    ]).select();

    setLoading(false);
    if (!error) {
      setCourseCode('');
      setCourseTitle('');
      fetchCourses();
      showNotice('Course added successfully.');
    } else {
      showNotice(error?.message || 'Course could not be added. Please try again.', 'error');
    }
  };

  // Delete Course
  const handleDeleteCourse = async (courseId: string) => {
    if (confirm('Are you sure you want to delete this course? All associated modules will be deleted.')) {
      await supabase.from('courses').delete().eq('id', courseId);
      fetchCourses();
    }
  };

  // 2. Add New Module
  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !moduleTitle) return;
    setLoading(true);

    const position = modules.length ? Math.max(...modules.map((module) => module.position || 0)) + 1 : 1;
    const moduleId = crypto.randomUUID();
    const { data, error } = await supabase.from('modules').insert([
      {
        id: moduleId,
        course_id: selectedCourseId,
        title: moduleTitle.trim(),
        content: moduleContent.trim() || 'Module content goes here...',
        position: position,
      },
    ]).select();

    if (!error && data?.[0]) {
      await supabase.from('quizzes').insert([{
        id: crypto.randomUUID(),
        module_id: data[0].id,
        subject: moduleTitle.trim(),
      }]);

    }

    setLoading(false);
    if (!error) {
      setModuleTitle('');
      setModuleContent('');
      fetchModules(selectedCourseId);
      showNotice('Module added successfully.');
    } else {
      showNotice(error?.message || 'Module could not be added. Please try again.', 'error');
    }
  };

  // Delete Module
  const handleDeleteModule = async (moduleId: string) => {
    if (confirm('Are you sure you want to delete this module?')) {
      await supabase.from('modules').delete().eq('id', moduleId);
      fetchModules(selectedCourseId);
    }
  };

  // 3. Add / Edit MCQ
  const handleSaveMcq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId || !mcqQuestion || !optionA || !optionB || !optionC || !optionD) return;

    setLoading(true);
    const response = await fetch('/api/admin/mcqs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleId: selectedModuleId,
        quizId,
        mcqId: editingMcqId,
        question: mcqQuestion,
        options: [optionA, optionB, optionC, optionD],
        correctOption,
        explanation,
      }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      showNotice(result.error || 'MCQ could not be saved. Please try again.', 'error');
      return;
    }
    if (result.quizId) setQuizId(result.quizId);
    setShowMcqForm(false);
    showNotice(editingMcqId ? 'MCQ updated successfully.' : 'MCQ added successfully.');
    if (selectedModuleId) fetchQuizAndMcqs(selectedModuleId);
  };

  const handleDeleteMcq = async (mcqId: string) => {
    if (confirm('Delete this MCQ?')) {
      const response = await fetch(`/api/admin/mcqs?id=${encodeURIComponent(mcqId)}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) {
        showNotice(result.error || 'MCQ could not be deleted.', 'error');
        return;
      }
      showNotice('MCQ deleted successfully.');
      if (selectedModuleId) fetchQuizAndMcqs(selectedModuleId);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center p-4 text-[#334155]">
        <h1 className="text-xl font-extrabold mb-2">Access Denied</h1>
        <p className="text-xs text-gray-600 mb-4">You need Admin privileges to view this page.</p>
        <Link href="/login" className="bg-teal-500 text-white px-4 py-2 rounded-xl text-xs font-bold">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#14b8a6] font-sans flex flex-col justify-between">
      <div>
        {/* Header with Navigation Controls */}
        <header className="border-b-2 border-teal-500/20 px-6 py-3 flex items-center justify-between bg-white shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 border border-teal-500/30 rounded-xl p-1 bg-teal-50/40">
              <button onClick={() => router.back()} title="Go Back" className="p-1.5 hover:bg-teal-100 rounded-lg text-teal-800 transition">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button onClick={() => router.forward()} title="Go Forward" className="p-1.5 hover:bg-teal-100 rounded-lg text-gray-400 transition hover:text-teal-800">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-black tracking-tight text-[#14b8a6]">CampusNotes</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#14b8a6]">Academic Library</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-gray-700">
            <span className="font-bold text-teal-800">{userEmail}</span>
            <button onClick={handleLogout} className="border-2 border-teal-500 text-teal-800 px-4 py-1.5 rounded-xl font-bold hover:bg-teal-50 transition">
              Logout
            </button>
          </div>
        </header>

        {notice && (
          <div className={`mx-6 mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${notice.type === 'success' ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-red-200 bg-red-50 text-red-700'}`} role="status">
            {notice.text}
          </div>
        )}

        {/* Main Work Area */}
        <div className="max-w-7xl w-full mx-auto px-6 py-6 flex flex-col lg:flex-row gap-6">
          {/* Sidebar Tabs */}
          <aside className="w-full lg:w-56 border-2 border-teal-500/30 rounded-2xl p-4 bg-teal-50/20 shrink-0">
            <div className="space-y-2">
              {[
                { name: 'Dashboard', icon: LayoutDashboard },
                { name: 'Courses', icon: Layers },
                { name: 'Modules', icon: FileText },
                { name: 'MCQ Banks', icon: HelpCircle },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.name;
                return (
                  <button
                    key={tab.name}
                    onClick={() => setActiveTab(tab.name)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${
                      isActive
                        ? 'border-2 border-teal-500 bg-teal-50 text-teal-900 shadow-sm'
                        : 'text-gray-700 hover:bg-teal-50/50'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-teal-600" />
                    {tab.name}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === 'Dashboard' && (
            <main className="flex-1">
              <h1 className="text-xl font-black text-[#334155] mb-4">Dashboard Overview</h1>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border-2 border-teal-500/30 rounded-2xl p-5 bg-teal-50/20 text-center">
                  <span className="text-3xl font-black text-teal-800 block mb-1">{courses.length}</span>
                  <span className="text-xs font-bold text-gray-600">Total Courses</span>
                </div>
                <div className="border-2 border-teal-500/30 rounded-2xl p-5 bg-teal-50/20 text-center">
                  <span className="text-3xl font-black text-teal-800 block mb-1">{modules.length}</span>
                  <span className="text-xs font-bold text-gray-600">Modules (Selected Course)</span>
                </div>
                <div className="border-2 border-teal-500/30 rounded-2xl p-5 bg-teal-50/20 text-center">
                  <span className="text-3xl font-black text-teal-800 block mb-1">{mcqs.length}</span>
                  <span className="text-xs font-bold text-gray-600">MCQs (Selected Module)</span>
                </div>
              </div>
            </main>
          )}

          {/* TAB 2: COURSES MANAGEMENT VIEW */}
          {activeTab === 'Courses' && (
            <main className="flex-1 flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <h1 className="text-xl font-black text-[#334155] mb-4">Manage Courses</h1>
                <div className="border-2 border-teal-500/20 rounded-xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-teal-50 border-b-2 border-teal-200 font-bold text-teal-900">
                        <th className="p-3 border-r border-teal-200 w-24">Code</th>
                        <th className="p-3 border-r border-teal-200">Course Title</th>
                        <th className="p-3 border-r border-teal-200">Category</th>
                        <th className="p-3 text-center w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-100">
                      {courses.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-gray-400 font-medium">No courses added yet.</td>
                        </tr>
                      ) : (
                        courses.map((c) => (
                          <tr key={c.id} className="hover:bg-teal-50/30 text-[#334155]">
                            <td className="p-3 border-r border-teal-100 font-black text-teal-800">{c.code}</td>
                            <td className="p-3 border-r border-teal-100 font-bold">{c.title}</td>
                            <td className="p-3 border-r border-teal-100">{c.category || 'CS'}</td>
                            <td className="p-3 text-center">
                              <button onClick={() => handleDeleteCourse(c.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg border border-red-200">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add New Course Form */}
              <aside className="w-full lg:w-80 border-2 border-teal-500/30 rounded-2xl p-5 bg-white shrink-0 shadow-sm">
                <form onSubmit={handleAddCourse} className="space-y-4">
                  <h2 className="text-sm font-extrabold text-teal-900 pb-2 border-b border-teal-100 flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add New Course
                  </h2>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Course Code</label>
                    <input
                      type="text"
                      placeholder="e.g. CS-301"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      required
                      className="w-full border-2 border-teal-200 rounded-xl p-2.5 text-xs text-[#334155] focus:outline-none focus:border-teal-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Course Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Operating Systems"
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      required
                      className="w-full border-2 border-teal-200 rounded-xl p-2.5 text-xs text-[#334155] focus:outline-none focus:border-teal-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Category</label>
                    <select
                      value={courseCategory}
                      onChange={(e) => setCourseCategory(e.target.value)}
                      className="w-full border-2 border-teal-200 rounded-xl p-2.5 text-xs text-[#334155] focus:outline-none focus:border-teal-500 font-bold bg-white"
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Software Engineering">Software Engineering</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Artificial Intelligence">Artificial Intelligence</option>
                      <option value="Cyber Security">Cyber Security</option>
                      <option value="Data Science">Data Science</option>
                      <option value="Human Resources">Human Resources</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-teal-500 text-white font-bold text-xs py-3 rounded-xl hover:bg-teal-600 transition shadow-md mt-2"
                  >
                    {loading ? 'Creating...' : '+ Create Course'}
                  </button>
                </form>
              </aside>
            </main>
          )}

          {/* TAB 3: MODULES MANAGEMENT VIEW */}
          {activeTab === 'Modules' && (
            <main className="flex-1 flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <h1 className="text-xl font-black text-[#334155] mb-4">Manage Modules</h1>

                <div className="mb-4">
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Select Course</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => fetchModules(e.target.value)}
                    className="w-full border-2 border-teal-500/30 rounded-xl p-2.5 bg-white text-xs font-bold text-[#334155] focus:outline-none focus:border-teal-500"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>Course: {c.code} {c.title}</option>
                    ))}
                  </select>
                </div>

                <div className="border-2 border-teal-500/20 rounded-xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-teal-50 border-b-2 border-teal-200 font-bold text-teal-900">
                        <th className="p-3 border-r border-teal-200 w-12 text-center">#</th>
                        <th className="p-3 border-r border-teal-200">Module Title</th>
                        <th className="p-3 text-center w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-100">
                      {modules.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-gray-400 font-medium">No modules found for this course.</td>
                        </tr>
                      ) : (
                        modules.map((m, idx) => (
                          <tr key={m.id} className="hover:bg-teal-50/30 text-[#334155]">
                            <td className="p-3 border-r border-teal-100 text-center font-bold">{idx + 1}</td>
                            <td className="p-3 border-r border-teal-100 font-bold">{m.title}</td>
                            <td className="p-3 text-center">
                              <button onClick={() => handleDeleteModule(m.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg border border-red-200">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add New Module Form */}
              <aside className="w-full lg:w-80 border-2 border-teal-500/30 rounded-2xl p-5 bg-white shrink-0 shadow-sm">
                <form onSubmit={handleAddModule} className="space-y-4">
                  <h2 className="text-sm font-extrabold text-teal-900 pb-2 border-b border-teal-100 flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add Module to Course
                  </h2>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Module Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Introduction & Basics"
                      value={moduleTitle}
                      onChange={(e) => setModuleTitle(e.target.value)}
                      required
                      className="w-full border-2 border-teal-200 rounded-xl p-2.5 text-xs text-[#334155] focus:outline-none focus:border-teal-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Module Content</label>
                    <textarea
                      rows={5}
                      placeholder="Write Markdown here: use tables, images, numbered steps, and code blocks..."
                      value={moduleContent}
                      onChange={(e) => setModuleContent(e.target.value)}
                      className="w-full border-2 border-teal-200 rounded-xl p-2.5 text-xs text-[#334155] focus:outline-none focus:border-teal-500 font-mono"
                    />
                    <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
                      Supported: Markdown tables, images, algorithms/code blocks, lists, and headings.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-teal-500 text-white font-bold text-xs py-3 rounded-xl hover:bg-teal-600 transition shadow-md"
                  >
                    {loading ? 'Adding...' : '+ Add Module'}
                  </button>
                </form>
              </aside>
            </main>
          )}

          {/* TAB 4: MCQ BANKS MANAGEMENT VIEW */}
          {activeTab === 'MCQ Banks' && (
            <main className="flex-1 flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h1 className="text-xl font-black text-[#334155]">MCQ Bank Management</h1>
                  <button
                    onClick={() => {
                      setEditingMcqId(null);
                      setMcqQuestion('');
                      setOptionA('');
                      setOptionB('');
                      setOptionC('');
                      setOptionD('');
                      setShowMcqForm(true);
                    }}
                    className="bg-teal-500 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-teal-600 transition shrink-0 shadow-sm"
                  >
                    + Add MCQ
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Select Course</label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => fetchModules(e.target.value)}
                      className="w-full border-2 border-teal-500/30 rounded-xl p-2.5 bg-white text-xs font-bold text-[#334155] focus:outline-none focus:border-teal-500"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>Course: {c.code} {c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Select Module</label>
                    <select
                      value={selectedModuleId}
                      onChange={(e) => fetchQuizAndMcqs(e.target.value)}
                      className="w-full border-2 border-teal-500/30 rounded-xl p-2.5 bg-white text-xs font-bold text-[#334155] focus:outline-none focus:border-teal-500"
                    >
                      {modules.map((m, idx) => (
                        <option key={m.id} value={m.id}>Module {idx + 1}: {m.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-2 border-teal-500/20 rounded-xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-teal-50 border-b-2 border-teal-200 font-bold text-teal-900">
                        <th className="p-3 border-r border-teal-200 w-10 text-center">#</th>
                        <th className="p-3 border-r border-teal-200">Question</th>
                        <th className="p-3 border-r border-teal-200 w-16 text-center">Correct</th>
                        <th className="p-3 text-center w-32">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-100">
                      {mcqs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-gray-400 font-medium">
                            No MCQs found for this module. Click "+ Add MCQ" to create one.
                          </td>
                        </tr>
                      ) : (
                        mcqs.map((mcq, idx) => (
                          <tr key={mcq.id} className="hover:bg-teal-50/30 text-[#334155]">
                            <td className="p-3 border-r border-teal-100 text-center font-bold">{idx + 1}</td>
                            <td className="p-3 border-r border-teal-100 font-medium">{mcq.question}</td>
                            <td className="p-3 border-r border-teal-100 text-center font-black text-teal-800">
                              {String.fromCharCode(65 + mcq.correct_option)}
                            </td>
                            <td className="p-3 text-center">
                              <button onClick={() => handleDeleteMcq(mcq.id)} className="text-red-600 hover:bg-red-50 p-1 rounded">
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MCQ Form Side Panel */}
              {showMcqForm && (
                <aside className="w-full lg:w-80 border-2 border-teal-500/30 rounded-2xl p-5 bg-white shrink-0 shadow-sm">
                  <form onSubmit={handleSaveMcq} className="space-y-3">
                    <h2 className="text-sm font-extrabold text-teal-900 pb-2 border-b border-teal-100">Add MCQ</h2>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-1">Question</label>
                      <textarea
                        rows={2}
                        value={mcqQuestion}
                        onChange={(e) => setMcqQuestion(e.target.value)}
                        required
                        className="w-full border-2 border-teal-200 rounded-xl p-2 text-xs text-[#334155]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Option A</label>
                      <input type="text" value={optionA} onChange={(e) => setOptionA(e.target.value)} required className="w-full border border-teal-200 rounded-lg p-1.5 text-xs text-[#334155]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Option B</label>
                      <input type="text" value={optionB} onChange={(e) => setOptionB(e.target.value)} required className="w-full border border-teal-200 rounded-lg p-1.5 text-xs text-[#334155]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Option C</label>
                      <input type="text" value={optionC} onChange={(e) => setOptionC(e.target.value)} required className="w-full border border-teal-200 rounded-lg p-1.5 text-xs text-[#334155]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Option D</label>
                      <input type="text" value={optionD} onChange={(e) => setOptionD(e.target.value)} required className="w-full border border-teal-200 rounded-lg p-1.5 text-xs text-[#334155]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-1">Correct Option</label>
                      <div className="flex gap-3 text-xs font-bold text-[#334155]">
                        {['A', 'B', 'C', 'D'].map((letter, idx) => (
                          <label key={letter} className="flex items-center gap-1 cursor-pointer">
                            <input type="radio" name="correctOpt" checked={correctOption === idx} onChange={() => setCorrectOption(idx)} />
                            <span>{letter}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-1">Explanation</label>
                      <textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} className="w-full border-2 border-teal-200 rounded-xl p-2 text-xs text-[#334155]" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="submit" className="flex-1 bg-teal-500 text-white py-2 rounded-xl text-xs font-bold hover:bg-teal-600">Save</button>
                      <button type="button" onClick={() => setShowMcqForm(false)} className="flex-1 border border-teal-500 text-teal-800 py-2 rounded-xl text-xs font-bold">Cancel</button>
                    </div>
                  </form>
                </aside>
              )}
            </main>
          )}
        </div>
      </div>
    </div>
  );
}