# Week 1 Progress Report

**Project:** CampusNotes – University Study Materials & Note Marketplace with AI Q&A
**Week:** 1 – Problem Definition & Toolchain Setup
**Name:** Mariyam Sehar
**Roll No:** 24-ST-048(B)
**GitHub Repository:** https://github.com/SeharMehar/Campus-Notes.git

---

## 1. Objective of Week 1

The objective of Week 1 was to finalize the project requirements, configure the development repository with Continuous Integration (CI), and initialize the base project using Next.js, Tailwind CSS and Node.js (Express).

## 2. Summary of Progress

The problem was defined and the project requirements were finalized. A GitHub repository was set up with a `client/` and `server/` structure and a GitHub Actions CI workflow. The base frontend (Next.js with Tailwind CSS) and the base backend (Node.js with Express) were initialized and run locally. The project is now ready for feature development in Week 2.

## 3. Deliverables Status

| Deliverable | Status |
|---|---|
| Problem definition and requirements finalized | Completed |
| Development repository created and configured | Completed |
| CI pipeline configured (GitHub Actions) | Completed |
| Frontend initialized (Next.js + Tailwind CSS) | Completed |
| Backend initialized (Node.js + Express) | Completed |

## 4. Problem Definition

University students usually find study material scattered across chat groups, drives and social media. Notes are hard to search, their quality is unknown, and there is no single place to ask questions about them. CampusNotes addresses this by providing one platform where students can find and share university study materials, ask an AI assistant questions about notes, and get summaries, while administrators keep the content organized.

## 5. Project Objectives

- Provide a single, organized place for university notes arranged by course and module.
- Allow students to upload and share notes through a note marketplace.
- Provide AI-powered Q&A and summaries to help students revise faster.
- Provide quizzes and progress tracking to support learning.
- Build the system on a modern, maintainable stack with automated checks (CI).

## 6. Finalized Requirements

### 6.1 Functional Requirements

- **FR-1:** The system shall allow students to browse, search and filter courses and notes.
- **FR-2:** The system shall organize notes by course and module and allow students to read them.
- **FR-3:** The system shall allow students to upload notes and list them on the marketplace.
- **FR-4:** The system shall allow students to ask questions about a note and receive an answer from the AI assistant.
- **FR-5:** The system shall generate an AI summary and key takeaways for a note on request.
- **FR-6:** The system shall provide quizzes (multiple-choice questions) and show scores with explanations.
- **FR-7:** The system shall track each student's progress through courses.
- **FR-8:** The system shall allow an administrator to manage courses, modules and notes.
- **FR-9:** The system shall display clear error messages when a request or the AI service fails.

### 6.2 Non-Functional Requirements

- **NFR-1 Performance:** Pages should load within about 3 seconds under normal conditions.
- **NFR-2 Usability:** The interface shall be simple and responsive on desktop, tablet and mobile devices.
- **NFR-3 Security:** API keys and secrets shall be kept on the server and never exposed in the browser; user input shall be validated.
- **NFR-4 Maintainability:** The code shall be modular, written in TypeScript on the frontend, and checked automatically by CI.
- **NFR-5 Portability:** The system shall run on any environment that supports Node.js.

### 6.3 Scope

**In scope:** browsing and searching notes, note upload and sharing, AI Q&A and summaries, quizzes, progress tracking and administration.
**Out of scope for the first version:** native mobile apps, live classes and video streaming, and online payment processing.

## 7. Technology Stack

| Purpose | Technology |
|---|---|
| Frontend framework | Next.js (React, TypeScript, App Router) |
| Styling | Tailwind CSS |
| Backend runtime and framework | Node.js with Express |
| Backend utilities | cors, dotenv, nodemon |
| Version control and hosting | Git and GitHub |
| Continuous Integration | GitHub Actions |
| Editor | Visual Studio Code |

## 8. Toolchain Setup

The development environment was prepared with the following tools:

- **Node.js (LTS)** and npm to run the frontend and backend.
- **Git** for version control, with the code hosted on GitHub.
- **Visual Studio Code** as the editor.

## 9. Repository Setup

A GitHub repository named `campusnotes` was created with a README and a Node `.gitignore`. The `main` branch holds stable code, and new work is done on feature branches and merged through pull requests, which also trigger the CI checks.

### Project Structure

```
campusnotes/
├── .github/
│   └── workflows/
│       └── ci.yml        # CI pipeline (GitHub Actions)
├── client/               # Next.js + Tailwind CSS frontend
├── server/               # Node.js + Express backend API
├── .gitignore
└── README.md
```

## 10. Base Project Initialization

### 10.1 Frontend (Next.js + Tailwind CSS)

The frontend was created in `client/` with TypeScript, ESLint, the App Router and Tailwind CSS:

```bash
npx create-next-app@latest client --typescript --tailwind --eslint --app
cd client
npm run dev        # runs at http://localhost:3000
```

### 10.2 Backend (Node.js + Express)

The backend was created in `server/` with Express, CORS and environment variable support:

```bash
mkdir server && cd server
npm init -y
npm i express cors dotenv
npm i -D nodemon
npm run dev        # runs at http://localhost:5000
```

The server exposes a health-check endpoint, `GET /api/health`, which returns:

```json
{ "status": "ok", "app": "CampusNotes API" }
```

## 11. Continuous Integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs automatically on every push to `main` and on every pull request. The client and server are checked in two separate jobs:

```
            git push / pull request
                      |
                      v
          GitHub Actions (ci.yml)
            |                    |
            v                    v
      Job: client           Job: server
      1. Checkout           1. Checkout
      2. Setup Node 22      2. Setup Node 22
      3. npm ci             3. npm ci
      4. npm run lint       4. node --check index.js
      5. npm run build
            |                    |
            +---------+----------+
                      v
          Checks pass (green tick)
```

This ensures that broken code is detected early, before it is merged.

## 12. System Architecture (Base Setup)

```
+-----------+   opens   +-----------------------------+   HTTP / JSON   +------------------------------+
|  Browser  | --------> |  client/  (Next.js)         | <-------------> |  server/  (Node.js + Express)|
|  (User)   |           |  Tailwind CSS, TypeScript   |      CORS       |  GET /api/health             |
+-----------+           |  http://localhost:3000      |                 |  http://localhost:5000       |
                        +-----------------------------+                 +--------------+---------------+
                                                                                        :
                                                                         (planned) Database, AI service
```

The frontend communicates with the backend through a REST API. The database and the AI service are planned for the coming weeks.

## 13. Risks and Mitigation

| Risk | Mitigation |
|---|---|
| Port conflicts when running client and server together | Client runs on port 3000 and the server port is configurable through the `PORT` environment variable. |
| API keys leaking to the browser | Keys are stored in server-side environment variables (`.env`, excluded from Git). |
| Scope growth (marketplace, AI Q&A, quizzes) | Requirements and scope are fixed in this report; payments are excluded from the first version. |
| Broken code being merged | CI runs lint, build and checks on every push and pull request. |

## 14. Plan for Next Week

- Design the database schema for users, courses, modules, notes and quizzes.
- Create the base layout and navigation in the Next.js frontend.
- Build the first backend API routes (courses and notes) and connect them to the frontend.
- Plan user authentication.

## 15. Conclusion

Week 1 established the foundation of the project: the problem and requirements are defined, the repository and CI pipeline are in place, and the Next.js frontend and Express backend are initialized and running. The project is ready to move into feature development in Week 2.
