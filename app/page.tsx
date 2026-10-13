// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { BookOpen, Search, ChevronLeft, ChevronRight, CheckCircle2, X } from 'lucide-react';

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

  useEffect(() => {
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

    if (data) setCourses(data);
    setLoading(false);
  };

  // Read progress for all courses from LocalStorage
  const loadAllUserProgress = () => {
    const progressMap: Record<string, string[]> = {};
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
      }
    }
    setUserProgressData(progressMap);
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
  const totalAvailableModules = courses.reduce((acc, curr) => acc + (curr.module_count || 3), 0);
  const totalCompletedModules = Object.values(userProgressData).reduce((acc, curr) => acc + curr.length, 0);
  const overallPercentage = totalAvailableModules > 0 ? Math.round((totalCompletedModules / totalAvailableModules) * 100) : 0;

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col justify-between">
      <div>
        {/* Top Navigation Bar - Without Back/Forward Buttons */}
        <header className="border-b-2 border-teal-500/20 px-6 py-3 flex items-center justify-between bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl text-teal-600 tracking-tight">
              CampusNotes
            </span>
          </div>

          <div className="flex items-center gap-2 max-w-md w-full mx-4">
            <input
              type="text"
              placeholder="Search by title or subject code (e.g. CS-301)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border-2 border-teal-500/30 rounded-xl text-xs text-black placeholder-gray-400 focus:outline-none focus:border-teal-500 bg-white"
            />
            <button className="bg-teal-500 text-white px-5 py-2 rounded-xl font-bold text-xs hover:bg-teal-600 transition flex items-center gap-1 shadow-sm">
              <Search className="w-3.5 h-3.5" /> Search
            </button>
          </div>

          <nav className="flex items-center gap-6 text-xs font-semibold text-gray-700">
            <Link href="/" className="hover:text-teal-600 font-bold">Courses</Link>

            {/* MY PROGRESS BUTTON */}
            <button
              onClick={handleOpenProgress}
              className="hover:text-teal-600 font-bold text-teal-800 flex items-center gap-1 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 transition"
            >
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              My Progress
            </button>

            <Link href={user?.role === 'ADMIN' ? '/admin' : '/login'} className="hover:text-teal-600 font-bold">
              Admin
            </Link>
          </nav>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-black">Find your course notes</h1>
            <p className="text-xs text-teal-700 font-medium mt-1">Open access. No login needed.</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition ${
                    isSelected
                      ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                      : 'bg-white text-gray-700 border-teal-500/30 hover:border-teal-500'
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedCourses.map((course) => {
                const completedCount = userProgressData[course.id]?.length || 0;
                const totalCount = course.module_count || 3;
                const coursePercent = Math.round((completedCount / totalCount) * 100);

                return (
                  <div
                    key={course.id}
                    className="border-2 border-teal-500/30 rounded-3xl p-5 bg-white flex flex-col justify-between shadow-sm hover:border-teal-500 transition"
                  >
                    <div>
                      <div className="bg-teal-50 border border-teal-200 rounded-2xl py-4 text-center mb-4">
                        <span className="text-lg font-extrabold text-teal-800 tracking-wider">
                          {course.code}
                        </span>
                      </div>
                      <h2 className="font-extrabold text-sm text-black mb-2">{course.title}</h2>
                      <span className="inline-block px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-[10px] font-bold text-teal-700 mb-4">
                        {course.category}
                      </span>
                    </div>

                    <div className="pt-2 flex items-end justify-between border-t border-teal-100">
                      <div>
                        <span className="text-[11px] font-semibold text-gray-600 block mb-1">
                          {completedCount} / {totalCount} modules completed
                        </span>
                        <div className="w-24 bg-gray-200 h-2 rounded-full overflow-hidden border border-teal-300">
                          <div
                            className="bg-teal-500 h-full transition-all duration-300"
                            style={{ width: `${coursePercent}%` }}
                          ></div>
                        </div>
                      </div>

                      <Link
                        href={`/course/${course.id}`}
                        className="bg-teal-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-teal-600 transition shadow-sm"
                      >
                        Open course
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* MY PROGRESS MODAL POPUP */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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

            {/* Course-wise Breakdown */}
            <h3 className="text-xs font-extrabold text-gray-700 uppercase mb-3">Courses Summary</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {courses.map((course) => {
                const completedCount = userProgressData[course.id]?.length || 0;
                const totalCount = course.module_count || 3;
                const coursePercent = Math.round((completedCount / totalCount) * 100);

                return (
                  <div key={course.id} className="border border-teal-200 rounded-xl p-3 bg-gray-50/50 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-black">{course.code}: {course.title}</h4>
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