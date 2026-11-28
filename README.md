# CampusNotes

**Learn. Practise. Progress.**

Free course notes, AI summaries, an AI tutor and practice quizzes for university students, in one calm and focused place.

**Live demo:** https://campus-notes-ut6c.vercel.app/

Built at **Punjab Tianjin University of Technology (PTUT)** and **ASTC** as a final year project of the Software Engineering programme.

---

## Overview

CampusNotes organizes university course material into clear, ordered modules and adds study tools around it: a summary generator, an AI tutor that answers from the module being studied, quizzes with explanations, flashcards and a personal learning dashboard.

Students can use everything **without creating an account**. Their progress is saved on their own device. Administrators sign in to a separate portal to add and maintain courses, modules and quiz questions for the whole university community.

---

## Features

### For students (no account needed)

| Feature | What it does |
|---|---|
| **Course catalogue** | Browse all courses and filter by category: Computer Science, Software Engineering, Information Technology, Artificial Intelligence, Cyber Security, Data Science and Human Resources. |
| **Module reader** | Each course is split into ordered modules. The notes are written in Markdown and shown as formatted text with headings, lists and key concepts, with a module list beside the reading area and a breadcrumb at the top. |
| **AI-powered summaries** | Turns a long module into short, focused revision notes in seconds with one button. |
| **Personal AI tutor** | Ask questions about the module you are studying. Answers are based on that module's notes, so they stay connected to the course material. |
| **Practice quizzes** | Multiple-choice quizzes with answer explanations, and study flashcards, to check understanding. |
| **Learning dashboard** (`/progress`) | Overall progress, study streak (current and best), XP and levels, quiz average, a 14-day study activity chart, quiz score trend, module completion, course progress and saved modules. |
| **Achievements** | Nine badges to unlock, for example *First Step*, *Quiz Starter*, *Perfectionist*, *On Fire*, *Week Warrior*, *AI Explorer*, *Curious Mind*, *Dedicated* and *Course Master*. |
| **Saved modules** | Bookmark any module and return to it quickly. |
| **Offline revision** | Print a module or save it as a clean PDF from the course page. |

### For administrators (Admin Portal)

- Sign in with e-mail and password, or with Google.
- **Dashboard overview** with the number of courses, modules (of the selected course) and MCQs (of the selected module).
- **Manage courses:** list, add (code, title, category) and delete courses.
- **Manage modules:** upload and edit the notes of each course.
- **MCQ banks:** maintain the quiz questions of each module.

---

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page with the course catalogue, feature overview and FAQ |
| `/course/[id]` | Course reader: module list, formatted notes, AI summary, AI tutor and quiz access |
| `/quiz/[id]` | Practice quiz with explanations and score |
| `/progress` | Personal learning dashboard |
| `/login` | Sign in to the Admin Portal or a student profile |
| `/admin` | Administrator area: dashboard, courses, modules and MCQ banks |

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) with React and TypeScript |
| Styling | Tailwind CSS, lucide-react icons |
| Content rendering | react-markdown |
| Database and authentication | Supabase (PostgreSQL, Row Level Security, `@supabase/ssr`) |
| AI features | A language-model API called from server-side routes |
| Hosting | Vercel |
| Version control | Git and GitHub, protected `main` branch with pull requests |

### Architecture

CampusNotes follows a three-tier design:

1. **Client:** the Next.js pages in the browser (catalogue, reader, quiz, dashboard, admin).
2. **API server:** Next.js server routes for sign-in, notes and the AI features, plus a server-side Supabase client that is never used in browser code.
3. **Database:** Supabase PostgreSQL.

### Database

The schema has 12 tables: `users`, `admins`, `students`, `courses`, `enrollments`, `modules`, `ai_summaries`, `progress`, `progress_modules`, `quizzes`, `mcqs` and `quiz_results`. A course has many modules, a module has one quiz, and a quiz has many MCQs.

---

## Getting started

### Prerequisites

- Node.js (current LTS version) and npm
- A Supabase project with the tables above
- A Vercel account (only for deployment)

### Install and run

```bash
git clone https://github.com/SeharMehar/Campus-Notes.git
cd Campus-Notes
npm install
npm run dev
```

Open http://localhost:3000.

### Environment variables

Create a `.env` file in the project root. **Never commit this file.**

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Address of your Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key for browser code |
| Server-side Supabase key | Used only by `lib/supabaseAdmin.ts`. It must **not** start with `NEXT_PUBLIC_`. |
| AI service key | Used only by the server routes that generate summaries and tutor answers |

When deploying to Vercel, add the same variables in **Project Settings > Environment Variables**, then redeploy. If the live site shows no courses, a missing variable is the first thing to check.

---

## Project structure

```text
campus-notes/
|-- app/
|   |-- admin/            administrator dashboard
|   |-- api/              server routes (auth/login, notes, ...)
|   |-- auth/callback/    authentication redirect handler
|   |-- course/[id]/      course reader
|   |-- login/            sign-in page
|   |-- quiz/[id]/        quiz page
|   |-- progress/         learning dashboard
|   |-- layout.tsx  page.tsx  globals.css
|-- lib/
|   |-- supabase.ts       browser database client
|   `-- supabaseAdmin.ts  server-side database client
|-- public/               logos and static files
|-- next.config.ts  tailwind.config.ts  tsconfig.json  eslint.config.mjs
`-- package.json
```

---

## Project documentation

The project was built over a 16-week plan. Weekly documents cover the requirements (SRS), the architecture and cloud topology, the database, API and UI wireframes, the project scaffolding and authentication, and the first vertical slice. They are kept in the repository (`week1.md` and onward).

## Security

- Secrets live only in `.env` and in the hosting provider's settings, never in the code.
- Row Level Security protects the database; the browser key can only read what the rules allow.
- Passwords are never stored in plain text.
- The `main` branch is protected: changes arrive through pull requests.

## Author

**Mariyam Sehar**, Software Engineering, Punjab Tianjin University of Technology (PTUT).

## License

CampusNotes © 2026. All rights reserved.
