# Development Tasks & Implementation Roadmap

## Smart India Hackathon — Problem Statement PS 26043
### CivicBridge: Crowdsourced Societal Problem-Solving Platform for Jharkhand

**Version:** 2.0 (Parallel Trust Architecture)  
**Execution Strategy:** Incremental, test-driven phases adhering strictly to `GEMINI.md`  

---

## Phase 1: Project Foundation & Specification Sync
- [x] Task 1.1: Populate and synchronize `/docs/` specifications (`PRD.md`, `USER_FLOW.md`, `UI_UX.md`, `TRD.md`, `DATABASE_SCHEMA.md`, `AI_SPEC.md`, `TASKS.md`).
- [ ] Task 1.2: Initialize backend project (`backend/`) with Node.js 20, Express, TypeScript, ESLint, and Prettier.
- [ ] Task 1.3: Initialize frontend project (`frontend/`) with React 18, Vite, TypeScript, and Tailwind CSS 3.4.
- [ ] Task 1.4: Configure environment profiles (`.env.example`) and shared TypeScript interfaces.

---

## Phase 2: Database Schema & Migration Execution
- [ ] Task 2.1: Implement `prisma/schema.prisma` with 12 models, pgvector extension, and orthogonal status enums (`ProblemStatus`, `VerificationStatus`, `PriorityTier`).
- [ ] Task 2.2: Ensure exactly 3 priority tiers (`HIGH: 70–100`, `MEDIUM: 40–69`, `LOW: 0–39`) and remove all references to `CRITICAL`.
- [ ] Task 2.3: Ensure single score architecture (no separate numerical verification score column).
- [ ] Task 2.4: Execute Prisma migrations against PostgreSQL with pgvector enabled.
- [ ] Task 2.5: Build database seed script (`prisma/seed.ts`) creating test accounts for all 5 roles (`CITIZEN`, `ADMIN`, `UNIVERSITY`, `INDUSTRY`, `STARTUP`) and 5 realistic sample problems across Jharkhand districts.

---

## Phase 3: Authentication & Role-Based Authorization
- [ ] Task 3.1: Implement `AuthService` with bcrypt password hashing (12 rounds) and JWT signing.
- [ ] Task 3.2: Implement `authenticateJWT` and `requireRole([Role])` Express middleware guards.
- [ ] Task 3.3: Implement backend auth routes (`POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`).
- [ ] Task 3.4: Build frontend `AuthContext` and Axios interceptor for JWT token injection.
- [ ] Task 3.5: Build frontend Login and Role-Based Registration views with role redirection.
- [ ] Task 3.6: Verify zero anonymous submission (all submissions require authenticated citizen account).

---

## Phase 4: Citizen Mobile Submission & Storage Service
- [ ] Task 4.1: Implement `StorageService` supporting Cloudinary uploads with local disk fallback (`/uploads`).
- [ ] Task 4.2: Build backend problem submission endpoint (`POST /api/v1/problems`) with Zod schema validation.
- [ ] Task 4.3: Build mobile-first 3-step submission wizard UI:
  - Step 1: Problem Title, Category, Description
  - Step 2: District dropdown (24 Jharkhand districts), GPS location button, camera file upload
  - Step 3: Affected population slider, frequency selector, submit button
- [ ] Task 4.4: Ensure minimum 44px touch targets across all mobile form controls.
- [ ] Task 4.5: Verify immediate publication of valid problems to the Problem Bank as `OPEN` and `AI_SCREENED`.

---

## Phase 5: AI Pipeline & Vector Duplicate Detection
- [ ] Task 5.1: Implement hybrid relevance filter (rule-based checks + LLM prompt) with failsafe fallback.
- [ ] Task 5.2: Implement categorization and 2-sentence summary generator.
- [ ] Task 5.3: Implement vector embedding generator (`text-embedding-3-small`) and pgvector cosine similarity search (`<=>` distance).
- [ ] Task 5.4: Ensure duplicate detection flags matches ($>0.85$ similarity) without automatically rejecting submissions.
- [ ] Task 5.5: Implement the exact unified Priority Score formula:
  $$\text{Priority Score} = (\text{Severity} \times 0.25) + (\text{Affected People} \times 0.25) + (\text{Frequency} \times 0.15) + (\text{Evidence} \times 0.15) + (\text{Urgency} \times 0.20)$$
  Normalized strictly to 0–100 scale, mapping to HIGH (70–100), MEDIUM (40–69), and LOW (0–39).
- [ ] Task 5.6: Implement parallel event hook: if Priority Score $\ge 70$, automatically surface problem in Government Review Queue.
- [ ] Task 5.7: Implement `MockAIService` fallback for deterministic offline execution.

---

## Phase 6: Tiered Validation & Government Admin Console
- [ ] Task 6.1: Build Admin Review Queue view displaying High-Priority problems and verification requests.
- [ ] Task 6.2: Build 5-factor verification modal allowing admin to confirm or adjust Severity, Affected, Frequency, Evidence, and Urgency.
- [ ] Task 6.3: Implement `PUT /api/v1/admin/problems/:id/verify` endpoint:
  - Updates `verificationStatus` to `GOVERNMENT_VERIFIED` or `DECLINED_BY_GOVT`
  - Records verifying official name, timestamp, and review remarks
  - Confirms/refines the single Priority Score (no second verification score)
- [ ] Task 6.4: Confirm that Government decline leaves the problem active and visible in the Problem Bank with transparent remarks.
- [ ] Task 6.5: Build duplicate merging interface for admins.
- [ ] Task 6.6: Build statewide aggregate analytics dashboard (Recharts) with district metrics.

---

## Phase 7: University Proposal & Academic Track
- [ ] Task 7.1: Build Problem Bank browsing view with filter chips (`All`, `Government-Verified`, `AI-Screened`, `High Priority`).
- [ ] Task 7.2: Ensure Problem Bank displays all valid problems with zero verification gate.
- [ ] Task 7.3: Build Student Team assembler (names, roll numbers, roles) and Faculty Mentor assigner.
- [ ] Task 7.4: Build proposal submission modal (`POST /api/v1/problems/:id/proposals`) enabled for both verified and AI-screened problems.
- [ ] Task 7.5: Build optional "Request Govt Verification" button for institutions (non-blocking).
- [ ] Task 7.6: Build milestone progress logging updater.

---

## Phase 8: Industry Collaboration & Startup Business Track
- [ ] Task 8.1: Build Industry explorer and collaboration registration modal covering 4 support dimensions (Mentorship, Tools, Prototyping, CSR).
- [ ] Task 8.2: Build Startup problem claiming workflow (`POST /api/v1/problems/:id/claim`) enabled for all valid problems.
- [ ] Task 8.3: Build structured Business Concept submission form (value prop, market size, business model, revenue model, sustainability).
- [ ] Task 8.4: Build institutional support request workflow for startups (government endorsements, university lab access).
- [ ] Task 8.5: Build venture lifecycle tracker:
  $$\text{Problem Claimed} \longrightarrow \text{Concept Submitted} \longrightarrow \text{Support Requested} \longrightarrow \text{Support Granted} \longrightarrow \text{Building} \longrightarrow \text{Piloted}$$

---

## Phase 9: Mobile Polish, Verification & Walkthrough
- [ ] Task 9.1: Perform viewport responsiveness audits across mobile (360px, 390px), tablet (768px), and desktop (1280px).
- [ ] Task 9.2: Verify touch target compliance ($\ge 44\text{px}$) across all interactive controls.
- [ ] Task 9.3: Execute full end-to-end demo script (Citizen submit $\rightarrow$ AI triage $\rightarrow$ Problem Bank live $\rightarrow$ Parallel Govt review $\rightarrow$ University proposal $\rightarrow$ Startup claim).
- [ ] Task 9.4: Run TypeScript type checks (`tsc --noEmit`) and frontend/backend production builds.
- [ ] Task 9.5: Create `walkthrough.md` documenting validation results.
