# Product Requirements Document (PRD)

## Smart India Hackathon — Problem Statement PS 26043
### CivicBridge: Crowdsourced Societal Problem-Solving Platform for Jharkhand

**Version:** 2.0 (Parallel Trust Architecture)  
**Theme:** Smart Governance / Social Impact  
**Target Region:** Jharkhand, India  
**Status:** Hackathon MVP Specification  

---

## 1. Executive Summary

CivicBridge is a web-based digital platform connecting the citizens of Jharkhand with institutions capable of solving ground-level societal challenges: **Government Departments**, **Universities**, **Industry**, and **Startups / Business Builders**.

The platform eliminates systemic coordination bottlenecks between citizens facing civic, infrastructural, and environmental problems and the entities capable of addressing them.

### Core Operating Paradigm: The Parallel Trust Model
1. **Citizen Submission**: A registered citizen reports a problem with district location, affected population info, and photo/document evidence via a mobile-first interface.
2. **AI Screening & Triage**: AI filters out spam/gibberish, categorizes the issue, generates a concise 2-sentence summary, checks for duplicates via vector similarity, and calculates a normalized **Priority Score (0–100)** mapped into one of three priority tiers: **HIGH**, **MEDIUM**, or **LOW**.
3. **Immediate Institutional Visibility**: Every valid problem passing the AI relevance filter is **immediately published** to the open Problem Bank labeled **AI-Screened**. Universities, industries, and startups can discover, view, claim, and submit proposals for the problem without waiting for government sign-off.
4. **Parallel Government Verification (Trust Signal)**:
   - **High-Priority problems (70–100)** are automatically surfaced prominently in the Government Review Queue.
   - Government Verification is an independent **trust and credibility signal**, not an access or visibility gate.
   - When verified, the problem receives a **Government-Verified** trust badge confirming its assessed importance and credibility.
   - If the Government declines verification, the problem remains active, open, and visible to all institutions as non-verified, with transparent official remarks.
5. **Collaborative Resolution**:
   - **Universities** assemble student teams with faculty mentors and submit structured proposals.
   - **Startups** claim problems to build sustainable commercial ventures and submit business concepts.
   - **Industry** provides technical tools, mentorship, prototyping resources, or CSR support.

---

## 2. Problem Statement

Citizens across Jharkhand routinely encounter acute civic, infrastructure, environmental, and social challenges. However:
- **Government departments** lack a unified, evidence-ranked view of ground-level problems and become severe bottlenecks when required to manually verify every single submission before institutions can act.
- **Universities** seek real-world community challenges for faculty research, student capstones, and engineering projects, but lack access to validated local data.
- **Industries** seek validated local problems for corporate social responsibility (CSR), open innovation, and regional impact.
- **Aspiring entrepreneurs and startups** lack a pipeline of verified societal pain points to build commercially viable, high-impact businesses around.

---

## 3. Product Roles

The platform enforces exactly **five authenticated roles** per `GEMINI.md`:
1. **Citizen**: Registers/logs in, reports problems, uploads photo/document evidence, tracks progress through an interactive milestone timeline.
2. **Government / Admin**: Reviews High-Priority problems and verification requests, confirms or refines the Priority Score, issues official Government-Verified endorsements or decline remarks, monitors statewide analytics.
3. **University**: Coordinates faculty mentors and student teams, browses all valid problems, submits solution proposals, logs milestone updates.
4. **Industry**: Explores community problems and active proposals, registers interest, offers mentorship, technical resources, prototyping facilities, or CSR sponsorship.
5. **Startup / Business Builder**: Discovers community problems, claims problems for commercialization, submits structured business concepts (revenue model, target beneficiaries, viability), requests government endorsements or institutional support.

---

## 4. Fundamental Concept Separation

To maintain architectural clarity and prevent systemic bottlenecks, the platform strictly separates three independent dimensions:

| Dimension | Meaning | Values | Control / Actor |
|---|---|---|---|
| **Priority** | Assessed societal importance and urgency | **HIGH (70–100)**<br>**MEDIUM (40–69)**<br>**LOW (0–39)** | Evaluated via standard 5-factor formula by AI; confirmed/adjusted by Admin |
| **Verification** | Government trust & independent endorsement | **AI_SCREENED** (Default)<br>**GOVERNMENT_VERIFIED**<br>**DECLINED_BY_GOVT** | Government Official / Admin (Parallel Stream) |
| **Lifecycle** | Progress of solution development and work | **OPEN**<br>**PROPOSAL_SUBMITTED**<br>**IN_PROGRESS**<br>**RESOLVED**<br>**CLOSED** | Driven by University, Startup, Industry, and Citizen actions |

> [!IMPORTANT]
> **Zero-Gate Rule**: Verification status is never used as a prerequisite or gate for problem visibility, university proposal submission, startup claiming, or industry collaboration.

---

## 5. End-to-End User Journey

```
[ Citizen Submits Problem ]
             │
             ▼
[ AI Relevance & Spam Filter ]
  ├── Blatant Spam/Profanity ──> Rejected (Logged for audit)
  ├── Borderline / Uncertain  ──> Flagged for Manual Admin Triage
  └── Legitimate Problem      ──> Processed by AI Pipeline
             │
             ▼
[ AI Enrichment & Priority Scoring ]
  ├── Taxonomy Category Tagging
  ├── 2-Sentence Scannable Summary
  ├── Vector Embedding & Duplicate Detection Check
  └── Priority Score (0–100) Computed via Unified Formula
             │
             ▼
[ IMMEDIATELY PUBLISHED TO PROBLEM BANK ]
Status: OPEN | Verification: AI_SCREENED | Priority: HIGH, MEDIUM, or LOW
             │
   ┌─────────┴────────────────────────────────────────┐
   │                                                  │
   ▼ (Immediate Access)                               ▼ (Parallel Event if Score >= 70)
[ INSTITUTIONAL STREAM ]                   [ GOVERNMENT STREAM ]
• Universities browse & propose            • High-Priority problems surfaced in queue
• Startups browse & claim                  • Admin reviews evidence & AI analysis
• Industry registers support               • Admin confirms/adjusts Priority Score
• Optional: Institutions can click         • Admin issues:
  "Request Govt Verification"                ├── GOVERNMENT_VERIFIED (Trust badge)
  (Does NOT pause or block ongoing work)     └── DECLINED_BY_GOVT (Active with remarks)
```

---

## 6. Single Priority Scoring System

The platform uses **exactly one unified formula** across AI processing, admin review, database fields, API responses, UI components, documentation, and automated tests.

### 6.1 The Unified Formula
$$\text{Priority Score} = (\text{Severity} \times 0.25) + (\text{Affected People} \times 0.25) + (\text{Frequency} \times 0.15) + (\text{Evidence} \times 0.15) + (\text{Urgency} \times 0.20)$$

Each dimension is normalized strictly to a **0–100 scale**:
- **Severity (25%)**: Seriousness of impact on life, health, safety, or infrastructure (0–100).
- **Affected People (25%)**: Scale of population impacted (e.g., individual = 20, neighborhood = 50, block = 75, district-wide = 100).
- **Frequency (15%)**: Occurrence rate (one-time = 25, periodic = 60, continuous/daily = 100).
- **Evidence (15%)**: Completeness and quality of uploaded photos, documents, and coordinates (0–100).
- **Urgency (20%)**: Time sensitivity and hazard risk assessed from submission context (0–100).

### 6.2 The Three Priority Tiers
- **HIGH**: **70.0 – 100.0** (Surfaced prominently in the Government Review Queue; highlighted for high-impact institutional action).
- **MEDIUM**: **40.0 – 69.9** (Standard community challenge; immediately active for solving).
- **LOW**: **0.0 – 39.9** (Minor or localized issue; immediately active for solving).

*(There is NO "CRITICAL" tier anywhere in the system).*

---

## 7. Government Verification (Trust & Credibility Signal)

### 7.1 Meaning of Government Verification
- Government Verification is **NOT** an access gate or permission check.
- It signifies that a designated government official has independently reviewed the submission, inspected the evidence, and confirmed the problem's credibility and assessed priority.
- For the MVP, the benefit of Government Verification is strictly:
  1. Higher credibility and public authenticity.
  2. Stronger trust signal for institutional selection.
  3. Official confirmation of societal importance.
- **No invented financial perks, funding, or grants** are attached to verification in the MVP.

### 7.2 Single Score Architecture
- There is **no separate numerical "Government Verification Score"**.
- The existing **Priority Score** remains the single importance metric for the problem.
- When an admin reviews a problem, the admin confirms or adjusts the 5 dimensions, updating the single Priority Score and recording:
  - Verifying official name and department
  - Verification timestamp
  - Official review remarks / decision rationale
  - Trust status: `GOVERNMENT_VERIFIED` or `DECLINED_BY_GOVT`

### 7.3 Transparent Government Decline
- If a government official declines to verify a problem (e.g., private land dispute, outside state jurisdiction), the problem is **never deleted or hidden**.
- It remains active and visible in the Problem Bank under `DECLINED_BY_GOVT` with official remarks displayed transparently.
- Universities, startups, and industries may continue working on the problem independently.

### 7.4 Institutional Verification Requests
- Universities, industries, and startups working on or considering an `AI-Screened` problem may click **"Request Govt Verification"**.
- This request is optional and flags the problem in the Government queue.
- Requesting verification does **not** pause, hide, or delay ongoing work.

---

## 8. Stakeholder Collaboration Features

### 8.1 University Collaboration Track
- **Browse All Problems**: Filter by domain (`Water & Sanitation`, `Infrastructure`, `Education`, etc.), district, priority tier, and verification status.
- **Select & Claim**: Choose any valid problem (`Government-Verified` or `AI-Screened`).
- **Team Assembly**: Form student teams with student roll numbers, emails, and roles.
- **Faculty Mentor**: Assign a verified faculty mentor to guide and validate the project.
- **Structured Proposal**: Submit technical approach, deliverables, timeline start/end dates, milestones, and estimated budget.
- **Progress Updates**: Post periodic milestone updates and photo evidence.

### 8.2 Industry Collaboration Track
- **Explore Community Needs**: Discover community problems and matched university proposals.
- **Register Support**: Select a problem/proposal and register support across four categories:
  1. *Mentorship*: Industry expert advisory.
  2. *Technical Tools*: Software licenses, APIs, or datasets.
  3. *Prototyping / Testing*: Access to industrial lab facilities.
  4. *CSR Funding*: Corporate Social Responsibility sponsorship interest.

### 8.3 Startup & Business Builder Track
- **Commercialization Discovery**: Browse validated problems suited for sustainable enterprise models.
- **Claim for Venture**: Formally claim intent to build a commercial solution around the problem.
- **Structured Business Concept Submission**:
  - Solution description
  - Target beneficiaries & market size
  - Business model & revenue streams
  - Operational sustainability model
- **Request Support**: Apply for government scheme referrals, endorsements, or university incubation/lab access.
- **Venture Lifecycle**: Track progress through structured stages:
  $$\text{Problem Claimed} \longrightarrow \text{Concept Submitted} \longrightarrow \text{Support Requested} \longrightarrow \text{Support Granted} \longrightarrow \text{Building} \longrightarrow \text{Piloted}$$

---

## 9. Government Dashboard & Statewide Analytics

The Government Admin Dashboard provides aggregate visibility across all 24 districts of Jharkhand:
- **Total Valid Submissions**: Count of problems that passed the AI relevance filter.
- **Priority Tier Breakdown**: Distribution across HIGH, MEDIUM, and LOW.
- **Verification Status Distribution**: Live count of `AI_SCREENED`, `GOVERNMENT_VERIFIED`, and `DECLINED_BY_GOVT`.
- **Active Review Queue**: Pending High-Priority items and institutional verification requests.
- **Institutional Engagement**: Active university proposals, registered industry partners, and active startup ventures.
- **District Map**: Visual geographical distribution of problems across Jharkhand.

---

## 10. Hackathon MVP Scope & Exclusions

### In-Scope (Must-Have)
1. 5-Role authenticated registration and login (JWT) with server-side RBAC.
2. Mobile-first citizen submission wizard with image/PDF evidence upload.
3. Hybrid AI relevance/spam filter (rejects gibberish, flags borderline items).
4. Automated AI categorization, 2-sentence summary, and vector duplicate detection (pgvector).
5. Unified Priority Score computation (0–100) and 3-tier mapping (HIGH, MEDIUM, LOW).
6. Immediate publication to open Problem Bank as `AI-Screened`.
7. Parallel Government Review Queue for High-Priority items and verification requests.
8. Admin verification console with 5-dimension confirmation and decision remarks (no second score).
9. University proposal submission with student team and faculty mentor management.
10. Industry interest registration across 4 support dimensions.
11. Startup venture track with structured business concept submission.
12. Government statewide analytics dashboard with real-time counters.

### Out-of-Scope (Excluded from MVP)
- Direct financial transaction / grant disbursement gateways.
- Automated synchronization with central/state scheme databases.
- Blockchain, Web3, or complex IoT integrations.
- Native mobile app store binaries (fully supported via responsive PWA/web).
- Anonymous citizen submissions (citizens must register to ensure accountability).
