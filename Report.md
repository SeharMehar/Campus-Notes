# Problem Discovery & User Personas

**Project:** CampusNotes (PTUT Student Portal)

---

## 1. Introduction

Students of Computer Science and Engineering at Punjab Tianjin University of Technology (PTUT) depend on notes that come from many different places. This document explains who our users are, what problems they face while studying, what we plan to build first, and why.

---

## 2. Problem Discovery

### 2.1 Who We Talked To

| Group | Who they are | How many |
|---|---|---|
| Students | CS and Engineering students of PTUT (semesters 2 to 7), both hostel and day scholars | 5 to 8 |
| Teachers / TAs | Lecturers and teaching assistants who share notes and take quizzes | 1 to 2 |

Each conversation was short (about 15 minutes) and informal. We asked about real situations, such as the last exam they prepared for, instead of asking what they "would like".

### 2.2 Interview Questions

**For students**
1. Which subjects are you studying this semester, and where do you get notes for each one?
2. Think about your last exam. What did you use to prepare, and what went wrong?
3. When you need one particular topic, how do you find it?
4. Which device do you mostly study on? How is your internet?
5. How do you check if you really understood a topic? Do you solve MCQs, and from where?
6. How do you keep track of what you have already finished in a subject?
7. Have you ever used a summary or an AI tool for notes? What was good or bad about it?
8. What would make you trust a notes website enough to use it every week?

**For teachers / TAs**
1. How do you share notes and practice questions with students right now?
2. How often do students ask you for the same material again?
3. How much time does it take you to prepare or update MCQs?
4. What do you wish you knew about how students study your subject?

### 2.3 Problems We Found

| No. | Problem | Who faces it | Result |
|---|---|---|---|
| 1 | Notes are spread across WhatsApp groups, drives and photos of handwritten pages. Students do not know which version is the latest. | Students | Time is wasted and some students study from old or incomplete notes. |
| 2 | There is no single place where each subject is organised topic by topic. | Students | Finding one topic before an exam takes too long. |
| 3 | Notes are long and there is no short version to revise from. | Students | Students cram at the last minute and understand less. |
| 4 | Practice MCQs are hard to find, mixed between subjects, or come without answers and explanations. | Students | Students cannot check their understanding in time. |
| 5 | Students cannot see how much of a subject they have completed. | Students | Some topics get skipped. |
| 6 | Teachers send the same files again and again, and every update has to be shared again everywhere. | Teachers / TAs | Extra work and different versions with different students. |
| 7 | Most students study on their phones with limited mobile data, and heavy PDFs and photos are difficult to read there. | Students | Existing material is used less than it could be. |

---

## 3. User Personas

### Persona 1: Ayesha Raza (Student)

| | |
|---|---|
| **Age and study** | 20 years old, BS Computer Science, 4th semester, PTUT |
| **Subjects** | Data Structures, Database Systems, Web Engineering, Software Testing |
| **Device** | Android phone (mostly), shared laptop in the hostel |
| **Internet** | Mobile data, which is often limited |

**Her role:** She is the main user of CampusNotes. She reads notes, revises, and practises quizzes.

**What she wants**
- To find any topic of any subject in a few taps.
- To revise quickly from a short summary before a test.
- To practise MCQs of one subject and see her score.
- To know which modules she has already finished.

**Her problems**
- Her notes are in WhatsApp groups, drives and photos, and the versions do not match.
- Long notes take too much time to read just before an exam.
- The MCQs she finds are mixed from different subjects and have no explanations.
- She does not know how much of each subject she has covered.
- Large files load slowly on her mobile data.

**How she studies:** In short sessions of 20 to 40 minutes, mostly on her phone. She does most of her preparation in the last two or three days before exams. She will use a tool only if it is free, fast, and does not ask her to sign up.

### Persona 2: Usman Tariq (Administrator / Content Maintainer)

| | |
|---|---|
| **Age and job** | 32 years old, lecturer and lab instructor, CS Department, PTUT |
| **Responsibility** | Prepares notes and MCQs for 2 to 3 subjects |
| **Device** | Laptop (mostly), phone |
| **Comfort with technology** | High, comfortable editing structured files |

**His role:** He looks after the content of CampusNotes: courses, modules and MCQs.

**What he wants**
- One place where the latest notes of each subject are kept.
- A simple way to add or correct a module or an MCQ.
- Fewer repeated requests from students for the same files.
- Quizzes that contain questions only from the correct subject.

**His problems**
- He sends the same files in many groups, so students end up with different versions.
- Every correction means sharing the file again.
- Writing MCQs with explanations takes a lot of time and there is no fixed format.

**How he works:** He prepares most material at the start of the semester and edits it before exams. He prefers a simple, fixed content structure over a complicated dashboard.

---

## 4. Problem Statement

Computer Science and Engineering students at Punjab Tianjin University of Technology study from notes that are scattered across messaging groups, drives and photographed pages, and there is no single organised place for each subject. Because of this, students waste time searching for the right version of a topic, find it hard to revise long notes quickly before exams, cannot practise subject-wise questions with instant feedback, and cannot see how much of a subject they have finished, while teachers have to keep re-sharing and manually updating the same material. CampusNotes solves this with one free, mobile-friendly web portal where every course is divided into 12 modules, an AI assistant turns any module into a short summary with key points, and 20-question subject-wise quizzes give instant feedback and a score, while the portal keeps track of the student's progress.

---

## 5. Core MVP Features

The first version of CampusNotes will have only these five features. They solve the biggest problems from Section 2.3.

| No. | Feature | What it does | Problems solved |
|---|---|---|---|
| 1 | **Course Catalog with Search** | Shows all courses with title, code and category. Students can search by name or code and filter by category. | 1, 2 |
| 2 | **12-Module Notes** | Every course has 12 modules with clean, readable notes. Students move between modules using tabs and Previous / Next buttons. Everything is free and needs no login. | 1, 2, 7 |
| 3 | **AI Note Summarizer** | A side panel creates a short summary of the open module and lists its top 4 key points. If something goes wrong, it shows a message and a retry button. | 3 |
| 4 | **Subject-wise Quiz** | 20 MCQs from the selected subject only. After each answer the student sees green or red with an explanation, and at the end gets a score percentage. The student can review the answers and try again. | 4 |
| 5 | **Progress Tracking** | Students mark modules as completed and see a progress bar for each course. When they return, the portal opens the last module they were reading. | 5 |

### How we will know the MVP works
- A student can find a course by searching its name or code in three clicks or less.
- All 12 modules of a course open without payment or login.
- The AI summary appears within a few seconds, or a clear retry option is shown.
- Every quiz has exactly 20 questions, all from one subject, and shows a score at the end.
- After refreshing the page, the progress bar and the last module stay the same.

### Left for later
An admin panel where teachers can upload notes and MCQs directly (for now the administrator edits the content files), and a report for teachers showing which topics students find difficult.

---

# END OF DOCUMENT
**End of "Problem Discovery & User Personas" (CampusNotes)**
