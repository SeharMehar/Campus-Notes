# 📋 PROBLEM DISCOVERY, USER PERSONAS & SCOPE DEFINITION

**Document Title:** Problem Discovery & Requirements Specification  
**Project Name:** CampusNotes – Open-Access Academic Portal  
**Author:** Sehar (Lead Developer / Student)  
**Institution:** Punjab Tianjin University of Technology (PTUT)  
**Phase / Milestone:** Week 1 – Domain Research, User Discovery & Scope Isolation  
**Date:** October 6, 2026  

---

## 1. PROBLEM DISCOVERY & TARGET USER RESEARCH

### 1.1 Methodology & Stakeholder Interviews
To uncover systemic operational friction within the current academic workflow of engineering and computer science students at Punjab Tianjin University of Technology (PTUT), qualitative research and contextual user interviews were conducted. The study targeted key academic demographics across 3rd-year and 4th-year undergraduate programs. 

The primary objective was to trace the end-to-end lifecycle of study material consumption, from daily lecture preparation to high-stakes examination revision and post-module self-assessment.

### 1.2 Core Operational Friction & Pain Points

* **Extreme Material Fragmentation:** Students encounter high cognitive friction due to learning materials being scattered across non-standardized channels (e.g., unofficial WhatsApp group chats, ephemeral Google Drive links, shared OneDrive folders, and legacy LMS portals). Finding a single, authoritative module slide or lecture note routinely takes 20–30 minutes per study session.
* **Cognitive Overload & Unstructured Revisions:** During midterm and final examination windows, students are overwhelmed by 40+ page unformatted slide decks per topic. The absence of concise, structured summaries forces students to spend critical revision hours manually distilling raw text rather than mastering core concepts.
* **Lack of Subject-Isolated Assessment Tools:** Existing public assessment tools and practice platforms feature broad, cross-domain question pools. Students lack access to subject-isolated MCQ evaluation engines that map strictly 1:1 with their university’s specific 12-module course syllabi (e.g., Data Structures, Operating Systems, Web Engineering).
* **High Barrier-to-Entry & Authentication Fatigue:** Traditional academic portals mandate length registration workflows, email verifications, and persistent login credentials. This authentication friction heavily discourages spontaneous, quick-reference revision sessions when students are on mobile devices or in time-sensitive situations.

---

## 2. COMPREHENSIVE USER PERSONAS

### **Persona 1: The Time-Constrained Exam Reviewer**

* **User Role:** 3rd Year Computer Science Undergraduate (PTUT)
* **Name & Profile:** Ali Hassan | Age 21 | High Academic Workload | Multi-Device User (Laptop/Mobile)
* **Behavioral Profile:**
  Ali balances a heavy course load of 6 technical subjects along with practical lab submissions. He relies heavily on high-yield, condensed revision notes during the 48–72 hours preceding midterms and final exams.
* **Core Goals:**
  * Rapidly review module concepts without reading hundreds of redundant slide pages.
  * Access course materials instantly without managing user credentials, solving CAPTCHAs, or dealing with paywalls.
  * Contextually summarize key operational theories (e.g., CPU Scheduling Algorithms, Graph Traversals) in bullet points.
* **Pain Points & Frustrations:**
  * Experiences severe fatigue when navigating unorganized, buried files inside crowded messaging groups.
  * Wastes vital study hours manually extracting main takeaways from long, unformatted PDF slides.
  * Frustrated by platforms that require account registration just to view basic study text.

---

### **Persona 2: The Assessment-Focused Concept Learner**

* **User Role:** Final Year Electrical & Software Engineering Student
* **Name & Profile:** Fatima Zahra | Age 22 | Preparing for University Exams & Technical Interviews
* **Behavioral Profile:**
  Fatima learns best through practical self-evaluation and iterative testing. After completing a theoretical learning unit, she immediately seeks structured assessment tools to test her retention and identify conceptual weaknesses.
* **Core Goals:**
  * Validate her domain knowledge using subject-isolated assessment engines aligned with course modules.
  * Receive real-time evaluation feedback (green/red indicators) along with detailed technical explanations for wrong choices.
  * Track her score breakdown to evaluate overall subject mastery before actual university examinations.
* **Pain Points & Frustrations:**
  * Standard online quiz platforms contain generic questions mixed with out-of-scope subjects.
  * Static study notes lack interactive self-assessment tools, leaving no way to measure actual readiness.
  * Current study groups provide answer keys without explaining *why* a specific option is correct or incorrect.

---

## 3. FINALIZED PROBLEM STATEMENT

Students enrolled in university engineering and computer science programs experience severe academic friction caused by fragmented study resources scattered across unstandardized media, a lack of automated, AI-assisted revision summaries during critical exam preparation, and the complete absence of subject-isolated assessment engines aligned strictly with university course syllabi. Furthermore, existing solutions impose unnecessary access barriers such as mandatory user registration and paywalls. 

**CampusNotes** directly solves these critical challenges by engineering an open-access, zero-friction academic portal. The system organizes complex university curricula into a standardized 12-module course directory, integrates a real-time AI-powered sidebar assistant to instantly extract key takeaways, and provides a subject-isolated 20-MCQ interactive quiz engine featuring instant green/red answer feedback, detailed explanations, and automated performance analytics.

---

## 4. CORE MVP FEATURE SPECIFICATIONS

1. **Structured 12-Module Course Catalog Directory:**
   A high-performance, open-access course directory on the homepage that categorizes 8–10 core university subjects into a standardized 12-module learning layout, allowing students to reach any topic with single-click routing.
2. **Zero-Friction Interactive Module Reader:**
   A distraction-free, highly readable reading interface built using modern dynamic layout structures that renders module study material instantly without requiring user registration, login gates, or subscription barriers.
3. **AI-Powered Module Summarizer & Key Takeaway Extractor:**
   A dynamic sidebar assistant integrated into the reading view that leverages modern language models to analyze active module text, generating concise dynamic summaries and extracting top 4 core bullet points for rapid revision.
4. **Subject-Isolated 20-MCQ Evaluation Engine:**
   A dedicated quiz engine mapped strictly 1:1 with specific course IDs, guaranteeing 0% cross-subject question contamination and providing a focused 20-question self-assessment environment.
5. **Real-Time Option Validation, Explanation & Score Reporting:**
   An interactive quiz feedback system that instantly validates student selections with **Green** (correct) or **Red** (incorrect) visual highlights, displays immediate answer explanations beneath each question, and computes a final score metrics report (total attempts, correct count, percentage score).

---

## 5. CONCLUSION & NEXT STEPS

The problem discovery and requirements definition phase successfully validated the operational friction experienced by PTUT students, confirming a clear demand for an integrated, zero-friction study portal. By formalizing detailed user personas and isolating the 5 core MVP feature deliverables, the foundational requirements for **CampusNotes** are fully established and aligned with academic software engineering standards. 

