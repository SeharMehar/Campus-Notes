// lib/progress.ts  (browser only)
// Everything a student does is remembered in localStorage: study days, quiz history, bookmarks, last position.
// From that we compute a streak, XP / level and achievement badges. No login is needed.

export interface QuizRecord { moduleId: string; title: string; score: number; at: string }
export interface Bookmark { moduleId: string; courseId: string; title: string; courseTitle?: string }
export interface LastVisit { courseId: string; moduleId: string; title: string; courseTitle?: string }

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

const today = () => new Date().toISOString().slice(0, 10);

/* ---------- study days & streak ---------- */
export function markStudyDay() {
  const days = read<string[]>('cn_days', []);
  if (!days.includes(today())) write('cn_days', [...days, today()].slice(-400));
}
export function getStudyDays(): string[] { return read<string[]>('cn_days', []); }

export function getStreak(days = getStudyDays()): { current: number; best: number } {
  const set = new Set(days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  // current streak: today or yesterday counts as "alive"
  let cursor = new Date();
  if (!set.has(fmt(cursor))) cursor = new Date(Date.now() - 86400000);
  let current = 0;
  while (set.has(fmt(cursor))) { current++; cursor = new Date(cursor.getTime() - 86400000); }
  // best streak
  const sorted = [...set].sort();
  let best = 0, run = 0, prev: number | null = null;
  for (const d of sorted) {
    const t = new Date(d).getTime();
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return { current, best };
}

/* ---------- quiz history ---------- */
export function addQuizRecord(r: QuizRecord) {
  write('cn_quiz_history', [...read<QuizRecord[]>('cn_quiz_history', []), r].slice(-200));
}
export function getQuizHistory(): QuizRecord[] { return read<QuizRecord[]>('cn_quiz_history', []); }

/* ---------- bookmarks ---------- */
export function getBookmarks(): Bookmark[] { return read<Bookmark[]>('cn_bookmarks', []); }
export function isBookmarked(moduleId: string) { return getBookmarks().some((b) => b.moduleId === moduleId); }
export function toggleBookmark(b: Bookmark): boolean {
  const list = getBookmarks();
  const exists = list.some((x) => x.moduleId === b.moduleId);
  write('cn_bookmarks', exists ? list.filter((x) => x.moduleId !== b.moduleId) : [...list, b]);
  return !exists;
}

/* ---------- resume where you left off ---------- */
export function setLastVisit(v: LastVisit) { write('cn_last', v); }
export function getLastVisit(): LastVisit | null { return read<LastVisit | null>('cn_last', null); }

/* ---------- small counters (AI summary / tutor usage) ---------- */
export function bump(counter: 'summaries' | 'tutor') {
  const c = read<Record<string, number>>('cn_counters', {});
  c[counter] = (c[counter] || 0) + 1;
  write('cn_counters', c);
}
export function getCounters() { return read<Record<string, number>>('cn_counters', {}); }

/* ---------- completed modules (same keys the course page already uses) ---------- */
export function getCompletedByCourse(courseIds: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const id of courseIds) out[id] = read<string[]>(`progress_${id}`, []);
  return out;
}

/* ---------- XP, level, badges ---------- */
export interface Stats {
  modulesDone: number;
  quizzes: number;
  perfectQuizzes: number;
  bestStreak: number;
  summaries: number;
  tutor: number;
  coursesFinished: number;
}

export function computeXp(s: Stats) {
  const xp = s.modulesDone * 50 + s.quizzes * 30 + s.perfectQuizzes * 40 + s.summaries * 10 + s.tutor * 5 + s.bestStreak * 20;
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const levelStart = 50 * (level - 1) ** 2;
  const levelEnd = 50 * level ** 2;
  return { xp, level, progress: Math.round(((xp - levelStart) / (levelEnd - levelStart)) * 100), next: levelEnd - xp };
}

export const BADGES: { id: string; title: string; desc: string; test: (s: Stats) => boolean }[] = [
  { id: 'first-step', title: 'First Step', desc: 'Complete your first module', test: (s) => s.modulesDone >= 1 },
  { id: 'quiz-starter', title: 'Quiz Starter', desc: 'Finish your first quiz', test: (s) => s.quizzes >= 1 },
  { id: 'perfectionist', title: 'Perfectionist', desc: 'Score 100% in a quiz', test: (s) => s.perfectQuizzes >= 1 },
  { id: 'on-fire', title: 'On Fire', desc: 'Study 3 days in a row', test: (s) => s.bestStreak >= 3 },
  { id: 'week-warrior', title: 'Week Warrior', desc: 'Study 7 days in a row', test: (s) => s.bestStreak >= 7 },
  { id: 'ai-explorer', title: 'AI Explorer', desc: 'Generate 3 AI summaries', test: (s) => s.summaries >= 3 },
  { id: 'curious-mind', title: 'Curious Mind', desc: 'Ask the AI tutor 5 questions', test: (s) => s.tutor >= 5 },
  { id: 'dedicated', title: 'Dedicated', desc: 'Complete 10 modules', test: (s) => s.modulesDone >= 10 },
  { id: 'course-master', title: 'Course Master', desc: 'Finish every module of a course', test: (s) => s.coursesFinished >= 1 },
];
