# CampusNotes – Project Guide

## 1. What the system does
CampusNotes is a web learning platform for PTUT students: course notes, AI summaries, an AI tutor chat,
practice quizzes, personal progress tracking (streak, XP, badges) and an admin portal with analytics.

## 2. Technology
| Layer | Technology |
|---|---|
| Front end | Next.js (App Router), React, Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| AI | Anthropic Claude API (or Google Gemini), called only from the server |
| Auth (admin) | bcrypt password check + HMAC-signed httpOnly cookie |
| Charts | Hand-written SVG components (`components/Charts.tsx`) |

## 3. Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill the values.
3. Supabase → SQL Editor → run `supabase/analytics.sql` (creates the analytics table).
4. `npm run dev` and open http://localhost:3000

## 4. Architecture (folders)
```
app/page.tsx                 landing page + course catalogue
app/course/[id]/page.tsx     reader: notes, AI summary, bookmark, print, AI tutor
app/quiz/[id]/page.tsx       quiz engine + result review
app/flashcards/[id]/page.tsx flip-card study mode
app/progress/page.tsx        student dashboard (streak, XP, badges, trends)
app/admin/page.tsx           admin portal (courses, modules, MCQs, analytics)
app/api/summarize            streaming AI summary (+ cache in ai_summaries)
app/api/chat                 streaming AI tutor, grounded on the module notes
app/api/track                stores anonymous usage events
app/api/admin/analytics      aggregates events (admin only)
app/api/auth/login           admin login, sets signed session cookie
lib/ai.ts                    all AI calls (summary, chat, quiz) in one place
lib/session.ts               signed session cookie helpers
lib/progress.ts              streak, XP, badges (localStorage)
lib/track.ts                 browser-side event tracking
components/                  Brand, SiteHeader/Footer, Charts, AnalyticsPanel, TutorChat, ThemeToggle
```

## 5. How the main features work
**AI summary** – the server reads the module text from the database, sends it to the AI with a fixed
structure (Overview, Key Concepts, How It Fits Together, Key Takeaways, Q&A) and streams the answer to the
browser. A finished summary is cached by a hash of the notes, so the same module is never paid for twice.

**AI tutor** – the last 8 messages plus the module notes are sent to the AI. The system prompt tells it to
answer from the notes and ignore any instructions found inside them (prompt-injection safety).
A per-IP rate limit protects the API key.

**Analytics** – the browser sends an anonymous random visitor id and an event name
(`page_view`, `module_view`, `summary_generated`, `quiz_completed`, `module_completed`, `tutor_message`).
The admin dashboard computes unique learners, returning learners, daily activity, most-read modules,
quiz score distribution, pass rate, hardest modules and a live activity feed, and can export CSV.
No personal data is stored.

**Progress / gamification** – stored in the student's browser. Streak = consecutive study days;
XP = 50 per module + 30 per quiz + bonuses; level = floor(sqrt(XP / 50)) + 1; nine achievement badges.

**Flashcards** – built from the same MCQ bank as the quiz: front = question, back = correct answer + explanation, with flip, shuffle, "I know this" tracking and keyboard shortcuts.

**Dark theme** – Tailwind colours are CSS variables; the `.dark` class on `<html>` re-maps the palette.

## 6. Security notes
- API keys live only in `.env` (server). Never commit `.env`.
- Admin analytics API checks the signed cookie; a forged cookie fails the HMAC check.
- Set a strong `ADMIN_PASSWORD` and `AUTH_JWT_SECRET`.

## 7. Questions a supervisor may ask
1. *Why Next.js?* Server routes keep the AI key secret, and pages stay fast.
2. *Why cache summaries?* Cost and speed: the AI runs once per version of the notes.
3. *How do you prevent the AI from inventing facts?* The prompt restricts it to the notes, with a fixed output structure.
4. *How are learners counted without login?* A random id in localStorage; unique ids = unique learners.
5. *What would you improve?* Student accounts (progress across devices), teacher dashboards per class, notifications.
