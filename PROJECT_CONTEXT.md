# CivicBridge — Project Context & Current Stage (SIH PS 26043)

> **Instructions for AI**: Read this context document carefully before answering questions, generating code, writing tests, or proposing modifications for this repository. Adhere strictly to the architecture, roles, rules, and current stage documented below.

---

## 1. Project Overview & Problem Statement

- **Platform Name**: CivicBridge
- **Event / Context**: Smart India Hackathon (SIH) — Problem Statement **PS 26043**
- **Theme**: Smart Governance / Social Impact
- **Target Region**: Jharkhand, India (24 Districts)
- **Goal**: A crowdsourced civic problem-solving platform connecting the citizens of Jharkhand with institutions capable of resolving community challenges: **Government Departments**, **Universities**, **Industry**, and **Startups / Business Builders**.

### The Core Problem Solved
1. **Government bottleneck**: Traditional grievance portals force government officials to review every single issue before any action can occur, creating massive backlogs.
2. **Disconnected institutions**: Universities lack verified local problems for student capstones/R&D; industries struggle to locate targeted CSR/open-innovation initiatives; startups lack ground-truth societal pain points to build commercial ventures around.
3. **Citizen disengagement**: Citizens report problems into black-box systems with zero visibility, tracking, or multi-stakeholder resolution.

---

## 2. Core Paradigm: The Parallel Trust Model (Zero-Gate Rule)

Unlike traditional sequential platforms (`Submit -> Govt Approves -> Public Sees`), CivicBridge implements a **Parallel Trust Model**:

```
[ Citizen Submits Problem (Mobile-First) ]
                   │
                   ▼
       [ AI Screening & Triage ]
  (Relevance, 2-Sentence Summary, Vector Duplicate Check, 5-Factor Priority Score)
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
[ Problem Bank (OPEN) ]   [ If Priority >= 70 ]
  * Visible immediately      * Prominently surfaced in
  * Labeled: AI_SCREENED       Govt Admin Review Queue
  * Institutions can view,   * Govt conducts verification
    claim & propose NOW        in parallel (independent trust signal)
```

### Orthogonal Dimension Separation
To eliminate bottlenecks, the system strictly separates three independent states:

| Dimension | Description | Possible Values | Controlled By |
|---|---|---|---|
| **Priority** | Urgency & societal impact | `HIGH` (70–100), `MEDIUM` (40–69), `LOW` (0–39) | Evaluated by AI via 5-factor formula; confirmed/adjusted by Admin |
| **Verification** | Government trust & endorsement | `AI_SCREENED` (Default), `GOVERNMENT_VERIFIED`, `DECLINED_BY_GOVT` | Government Official / Admin (Parallel Stream) |
| **Lifecycle** | Resolution progress | `OPEN`, `PROPOSAL_SUBMITTED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` | Driven by University, Startup, Industry, and Citizen actions |

> **CRITICAL RULE (Zero-Gate Rule)**:
> Verification is a **trust signal**, NOT an access or visibility gate. Valid problems are published immediately to the Problem Bank as `AI_SCREENED`. Universities, startups, and industries can submit proposals and claim problems **without waiting for government verification**.

---

## 3. Product Roles & Access Control

The platform enforces exactly **five authenticated roles** (`Role` enum):

1. **`CITIZEN`**:
   - Submits civic problems via a mobile-first wizard (location, photos/docs, affected population, frequency).
   - Upvotes and tracks issues on an interactive milestone timeline.
   - *Zero anonymous submissions* — authenticated accounts only.

2. **`ADMIN` (Government / Admin)**:
   - Reviews High-Priority problems (score $\ge 70$) and institution verification requests.
   - 5-Factor verification modal: adjusts/confirms severity, affected population, frequency, evidence, urgency.
   - Marks problem `GOVERNMENT_VERIFIED` or `DECLINED_BY_GOVT` with official remarks and officer name.
   - Monitors statewide aggregate analytics across Jharkhand's 24 districts.

3. **`UNIVERSITY`**:
   - Browses Problem Bank with zero verification gating.
   - Assembles student teams (names, roll numbers, disciplines, roles) with a faculty mentor.
   - Submits structured proposals (`POST /api/v1/problems/:id/proposals`) and logs milestone updates.
   - Can optionally click "Request Govt Verification" (non-blocking).

4. **`INDUSTRY`**:
   - Discovers problems and active university proposals.
   - Pledges support across 4 dimensions: Mentorship, Technical Tools/Licenses, Prototyping/Lab Facilities, or CSR Sponsorship.

5. **`STARTUP` (Business Builder / Entrepreneur)**:
   - Claims community problems for commercial venture development.
   - Submits structured Business Concepts (Value Proposition, Target Beneficiaries, Market Size, Revenue Model, Operational Viability, Environmental Impact).
   - Tracks venture lifecycle: `Problem Claimed` $\rightarrow$ `Concept Submitted` $\rightarrow$ `Support Requested` $\rightarrow$ `Support Granted` $\rightarrow$ `Building` $\rightarrow$ `Piloted`.

---

## 4. AI Rules & Scoring Formula

1. **AI is Advisory**: Never silently convert AI output into a government decision. Uncertain results favor flagging for manual review.
2. **Duplicate Detection**: Uses vector embeddings (`text-embedding-3-small` or local mock) and pgvector cosine similarity. Submissions with $>0.85$ similarity are **flagged** with duplicate matches for admin merge, **never automatically rejected**.
3. **Unified Priority Score Formula (0–100)**:
   $$\text{Priority Score} = (\text{Severity} \times 0.25) + (\text{Affected People} \times 0.25) + (\text{Frequency} \times 0.15) + (\text{Evidence} \times 0.15) + (\text{Urgency} \times 0.20)$$
   - Each factor is rated 0–100.
   - Mapped strictly to 3 priority tiers:
     - **HIGH**: $70 \le \text{Score} \le 100$ (surfaced in Govt queue automatically)
     - **MEDIUM**: $40 \le \text{Score} \le 69$
     - **LOW**: $0 \le \text{Score} \le 39$
   - *There is no separate numerical "verification score" column.* A single score is confirmed or updated by government reviewers.

---

## 5. Technology Stack & Directory Structure

### Backend
- **Runtime**: Node.js 20 LTS, Express, TypeScript
- **Database & ORM**: PostgreSQL with `pgvector` extension, Prisma ORM
- **Authentication**: JWT (Access Token in `Authorization: Bearer <token>`), bcrypt (12 rounds)
- **AI Integration**: Google Gemini API (`@google/genai`) with deterministic offline `MockAIService` fallback
- **File Uploads**: Multer with local disk storage (`backend/uploads/`) and Cloudinary adapter
- **Validation**: Zod runtime schema validation

### Frontend
- **Framework**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS 3.4, Vanilla CSS variables, Lucide React icons
- **State & Routing**: React Context (`AuthContext`), React Router v6
- **Charts & Dashboards**: Recharts
- **Deployment Configs**: `vercel.json` rewrite routing, cross-origin resource sharing configured

### Repository Directory Map
```
d:/sih 2026/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # 12 Prisma models, pgvector extension, enums
│   │   ├── seed.ts             # 5 role accounts + 5 realistic Jharkhand sample problems
│   │   └── migrations/         # PostgreSQL DDL migrations
│   ├── src/
│   │   ├── app.ts              # Express application setup, CORS, route mounting
│   │   ├── server.ts           # HTTP server bootstrap
│   │   ├── config/             # Environment variables and DB connection
│   │   ├── middleware/         # auth.middleware (JWT + requireRole), upload.middleware
│   │   ├── routes/             # auth, problem, admin, institutional, health routes
│   │   ├── services/
│   │   │   └── ai/             # ai.service, gemini.ai.service, mock.ai.service,
│   │   │                       # duplicate.detector, priority.calculator
│   │   └── types/              # Express, Auth, and Domain TypeScript types
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Route definitions & ProtectedRoute wrapper
│   │   ├── context/            # AuthContext (token storage, login, logout, user state)
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx           # Auth login & tabbed role registration
│   │   │   ├── ReportProblemPage.tsx   # Mobile-first 3-step citizen submission wizard
│   │   │   ├── ProblemBankPage.tsx     # Filterable problem catalog with search & badges
│   │   │   ├── ProblemDetailsPage.tsx  # Deep tabbed view (proposals, claims, govt badge)
│   │   │   └── dashboards/
│   │   │       ├── AdminDashboard.tsx      # High-priority queue, 5-factor modal, stats
│   │   │       ├── CitizenDashboard.tsx    # Citizen's reported problems & timeline
│   │   │       ├── UniversityDashboard.tsx # Active academic proposals & student teams
│   │   │       ├── IndustryDashboard.tsx   # CSR & tech support registrations
│   │   │       └── StartupDashboard.tsx    # Claimed ventures & business concepts
│   └── tailwind.config.js
└── docs/
    ├── PRD.md                  # Complete Product Requirements Document
    ├── TRD.md                  # Technical Architecture & API Specifications
    ├── DATABASE_SCHEMA.md      # Data model, relations, indices, and constraints
    ├── USER_FLOW.md            # Step-by-step role user journeys
    ├── UI_UX.md                # Design system tokens, mobile touch guidelines
    ├── AI_SPEC.md              # AI prompt templates, scoring formulas, duplicate search
    └── TASKS.md                # Master roadmap and phase completion checklist
```

---

## 6. Key Database Models (Prisma)

- `User`: id, name, email, passwordHash, role (`CITIZEN`, `ADMIN`, `UNIVERSITY`, `INDUSTRY`, `STARTUP`), organization, phone, district.
- `Problem`: title, description, category, district, coordinates, affectedPeople, frequency, severityScore, priorityScore, priorityTier (`HIGH`, `MEDIUM`, `LOW`), status (`OPEN`, `PROPOSAL_SUBMITTED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), verificationStatus (`AI_SCREENED`, `GOVERNMENT_VERIFIED`, `DECLINED_BY_GOVT`), duplicateOfId, createdById.
- `Attachment`: url, filename, fileType, fileSize, problemId.
- `AIAnalysis`: relevanceScore, isRelevant, suggestedCategory, summary, priorityScore, severity, affectedPeople, frequency, evidence, urgency, duplicateMatches (JSON), rawResponse.
- `VerificationRecord`: problemId, verifiedById, verificationStatus, officialRemarks, verifiedScore, reviewedAt.
- `Proposal`: problemId, universityId, title, abstract, methodology, budget, durationMonths, status, requestedGovtVerification.
- `ProposalMember`: proposalId, name, rollNumber, department, role (`STUDENT_LEAD`, `STUDENT_MEMBER`, `FACULTY_MENTOR`).
- `ProposalMilestone`: proposalId, title, description, targetDate, status (`PENDING`, `IN_PROGRESS`, `COMPLETED`).
- `StartupClaim`: problemId, startupId, status, claimedAt.
- `BusinessConcept`: claimId, valueProposition, targetBeneficiaries, marketSize, revenueModel, operationalViability, environmentalImpact.
- `SupportRequest`: claimId, requestedFrom (`GOVERNMENT`, `UNIVERSITY`, `INDUSTRY`), description, status.
- `IndustryCollaboration`: problemId, proposalId, industryId, supportType (`MENTORSHIP`, `TOOLS_LICENSES`, `PROTOTYPING_FACILITIES`, `CSR_SPONSORSHIP`), description, contactPerson, status.

---

## 7. Key API Endpoints Reference

### Auth (`/api/v1/auth`)
- `POST /register`: Registers user with one of the 5 roles.
- `POST /login`: Authenticates with email/password; returns JWT and user profile.
- `GET /me`: Returns authenticated user profile (`Bearer` token required).

### Problems (`/api/v1/problems`)
- `GET /`: Lists problems with filters (`district`, `category`, `priorityTier`, `verificationStatus`, `status`, `search`).
- `POST /`: Citizen creates problem (multipart form with image/doc uploads). Runs AI triage pipeline synchronously/asynchronously.
- `GET /:id`: Retrieves full problem details, AI analysis, attachments, verification, proposals, and claims.
- `POST /:id/upvote`: Citizen upvote toggle.

### Government Admin (`/api/v1/admin`)
- `GET /review-queue`: Fetches high-priority and verification-requested problems.
- `PUT /problems/:id/verify`: Submits official verification (`GOVERNMENT_VERIFIED` or `DECLINED_BY_GOVT`), updates 5-factor priority score, records official remarks.
- `GET /analytics`: Statewide metrics, district counts, resolution rates.

### Institutional Collaborations (`/api/v1/institutional`)
- `POST /problems/:id/proposals`: University submits structured proposal with student team members.
- `POST /proposals/:id/milestones`: Logs milestone progress update.
- `POST /problems/:id/claim`: Startup claims problem for commercialization.
- `POST /claims/:id/concept`: Startup submits detailed business concept.
- `POST /claims/:id/support-request`: Startup requests lab access, govt endorsement, or industry support.
- `POST /problems/:id/collaborate`: Industry registers CSR, mentorship, or prototyping support.

---

## 8. Current Project Stage & Readiness

### ✅ What Has Been Implemented & Working:
1. **Full Documentation & Specs Sync**: PRD, TRD, UI/UX, DB schema, User Flow, AI Spec, and Tasks thoroughly populated and aligned.
2. **Prisma Database Layer**: Complete schema with all 12 models, pgvector vector column, seed script with Jharkhand test accounts for all 5 roles and sample problems.
3. **Backend API**:
   - Auth with bcrypt & JWT.
   - Problem submission with Multer upload & AI pipeline.
   - Gemini AI service with offline mock fallback.
   - pgvector cosine similarity duplicate detector.
   - Admin verification flow with 5-factor recalculation.
   - University proposal submission with student rosters.
   - Startup claim & business concept submission.
   - Industry collaboration registration.
4. **Frontend Single Page Application**:
   - Modern, responsive Tailwind UI with custom Jharkhand theme tokens.
   - Mobile-first Citizen Problem Submission Wizard (touch targets $\ge 44\text{px}$, district dropdown, geolocation, image upload).
   - Problem Bank with search, district/category filters, and trust badges (`Government-Verified` vs `AI-Screened`).
   - Comprehensive Problem Details Page with tabbed interfaces for proposals, business ventures, industry support, and admin verification logs.
   - Role-specific dashboards for all 5 roles (`AdminDashboard`, `CitizenDashboard`, `UniversityDashboard`, `IndustryDashboard`, `StartupDashboard`).
5. **Deployment Configuration**:
   - Frontend `vercel.json` SPA rewrite rules.
   - Backend CORS configured to accept local dev (`localhost:5173`) and production frontend URLs.
   - Environment templates (`.env.example`) present in both frontend and backend.

### 🔄 Current Immediate Next Steps:
1. **Cloud Database Deployment**: Hooking PostgreSQL instance with `pgvector` enabled (e.g., Supabase / Neon / AWS RDS) and running `npx prisma migrate deploy` and `npm run seed`.
2. **Cloud Storage Credentials**: Connecting Cloudinary API keys or AWS S3 credentials for production image persistence.
3. **Live AI API Key**: Adding `GEMINI_API_KEY` into backend `.env` (system seamlessly uses `MockAIService` if omitted).
4. **Automated End-to-End Test Suite**: Adding Cypress / Playwright tests or Jest integration tests verifying the full lifecycle from Citizen submission to University proposal & Admin verification.

---

## 9. Rules for Any AI Assisting with this Codebase

When continuing development or assisting with this repository:
1. **Never break the Zero-Gate Rule**: Do not make government verification a prerequisite for institutional action or problem visibility.
2. **Strictly 3 Priority Tiers**: High ($70–100$), Medium ($40–69$), Low ($0–39$). Never introduce a `CRITICAL` tier.
3. **Single Priority Score**: Never create a separate numerical "verification score" column. Admin verification confirms or updates the single Priority Score.
4. **Advisory AI**: AI outputs must always be distinguishable from government decisions. Never auto-reject problems based on duplicate similarity.
5. **Mobile-First**: Always ensure touch targets $\ge 44\text{px}$, responsive cards, and clean mobile views for citizen workflows.
6. **Strict Types**: Use TypeScript interfaces without unnecessary `any` casting.
