# CivicBridge User Flows (SIH PS 26043)

## 1. Overview Table

| Stakeholder | Flow Name | Trigger | Core Outcome |
|---|---|---|---|
| **Citizen** | Registration & Login | User registers / signs in | Authenticated session token (JWT) |
| **Citizen** | Problem Submission | Citizen fills structured form | Problem saved as `OPEN` & `AI_SCREENED`; immediately visible in Problem Bank |
| **Citizen** | Problem Tracking | Citizen views problem detail | Visual progress timeline across solution & verification states |
| **Government** | Review Queue Access | Admin opens review portal | Filtered list of High-Priority problems (70–100) & verification requests |
| **Government** | Independent Verification | Admin evaluates 5 dimensions | Updates status to `GOVERNMENT_VERIFIED` or `DECLINED_BY_GOVT` with remarks & confirms Priority Score |
| **Government** | Duplicate Merge | Admin inspects duplicate flags | Combines duplicate records while preserving submitter credit |
| **Government** | Statewide Analytics | Admin opens dashboard | Real-time district heatmap and lifecycle tracking metrics |
| **University** | Browse Problem Bank | University explores problems | Browses both `Government-Verified` and `AI-Screened` problems |
| **University** | Proposal Submission | University claims problem | Submits team details, faculty mentor, approach, timeline, and milestones |
| **University** | Verification Request | University requests review | Optional request sent to Government for an `AI-Screened` problem (non-blocking) |
| **University** | Milestone Progress Post | University logs progress | Progress update and evidence attached to project timeline |
| **Industry** | Browse Problems/Projects| Industry browses platform | Discovers problems and university proposals matching industrial domains |
| **Industry** | Register Support | Industry selects issue | Registers Mentorship, Technical Tools, Prototyping, or CSR interest |
| **Startup** | Browse Problems | Startup explores bank | Discovers problems suitable for sustainable commercial models |
| **Startup** | Claim for Venture | Startup selects problem | Formally claims problem for enterprise solution development |
| **Startup** | Business Concept Post | Startup submits concept | Submits revenue model, target beneficiaries, and operational model |
| **Startup** | Support Request | Startup requests backing | Applies for government scheme referral, endorsement, or university lab access |
| **System/AI** | Auto-Triage Pipeline | Problem submitted | Runs spam filter, categorization, summary, duplicate check, and Priority Score |

---

## 2. Citizen Flows

### 2.1 Registration & Authentication Flow
1. **Action:** Citizen enters Name, Email, Password, Phone Number, and District.
2. **Endpoint:** `POST /api/v1/auth/register` (Role: `CITIZEN`).
3. **Backend:** Hashes password with bcrypt (12 rounds) and creates an active user record.
4. **Endpoint:** `POST /api/v1/auth/login` (Data: `email, password`).
5. **Success State:** Returns JWT session token; user redirected to Citizen Dashboard.

### 2.2 Problem Submission Flow (Parallel Trust Model)
```mermaid
flowchart TD
    A[Citizen Opens Form] --> B[Enter Title, Description, Category, District, Affected Count]
    B --> C[Upload Photo / Document Evidence]
    C --> D[Submit Form -> POST /api/v1/problems]
    D --> E{AI Relevance Filter}
    E -->|Spam / Abuse| F[Status: FILTERED_OUT / Logged for Audit]
    E -->|Borderline / Uncertain| G[Status: FLAGGED_FOR_REVIEW / Admin Triage]
    E -->|Valid Problem| H[AI Enrichment & Priority Scoring]
    H --> I[Assign Category, 2-Sentence Summary, Vector Embeddings]
    H --> J[Calculate Priority Score: 0 - 100 & Tier: HIGH / MED / LOW]
    J --> K[PUBLISH IMMEDIATELY TO PROBLEM BANK]
    K --> L[Status: OPEN | Verification: AI_SCREENED]
    L --> M{Priority >= 70 ?}
    M -->|Yes| N[Parallel Event: Enqueue to Government Review Queue]
    M -->|No| O[Open for Institutional Solving]
```
1. **Action:** Citizen enters problem title, description, category, district, and affected population count.
2. **Action:** Citizen attaches photo or document evidence.
3. **Endpoint:** `POST /api/v1/problems` (Multipart form-data).
4. **Backend Processing:**
   - AI Relevance Filter checks text.
   - AI categorizes and creates a 2-sentence summary.
   - Vector embeddings check cosine similarity for duplicates (flagged if $>0.85$, never auto-rejected).
   - Unified Priority Score formula is executed:
     $$\text{Priority Score} = (\text{Severity} \times 0.25) + (\text{Affected People} \times 0.25) + (\text{Frequency} \times 0.15) + (\text{Evidence} \times 0.15) + (\text{Urgency} \times 0.20)$$
   - Tiers: `HIGH (70–100)`, `MEDIUM (40–69)`, `LOW (0–39)`.
5. **Immediate Publication:** Record saved with `status: OPEN` and `verificationStatus: AI_SCREENED`.
6. **Parallel Hook:** If Priority is `HIGH`, an asynchronous task adds the problem to the Government Review Queue.
7. **Success State:** Citizen receives confirmation and tracking ID.

### 2.3 Problem Tracking Flow
1. **Action:** Citizen navigates to "My Submissions" and selects a problem.
2. **Endpoint:** `GET /api/v1/problems/:id`.
3. **Display:** Real-time visual stepper showing:
   - Verification Status (`AI-Screened`, `Government-Verified`, or `Declined with Remarks`)
   - Solution Progress (`Open`, `Proposal Submitted`, `In Progress`, `Resolved`)
   - Attached university teams, active startups, or industry partners.

---

## 3. Government Official / Admin Flows

### 3.1 Problem Review Queue Flow
1. **Action:** Government official opens the Review Queue.
2. **Endpoint:** `GET /api/v1/admin/review-queue?tier=HIGH`.
3. **Display:** Prioritizes High-Priority problems (70–100) and problems with institutional verification requests.
4. **Key Rule:** Problems in this queue are **already live and visible** to universities and startups in the Problem Bank.

### 3.2 Problem Verification Flow (Parallel Trust Signal)
1. **Action:** Admin opens a problem to inspect evidence, location, citizen description, and AI triage output.
2. **Action:** Admin confirms or refines each of the 5 scoring dimensions (Severity, Affected People, Frequency, Evidence, Urgency) on a 0–100 scale.
3. **Action:** Admin selects verification decision:
   - **Approve**: Updates `verificationStatus` to `GOVERNMENT_VERIFIED`, logs verifying official name, timestamp, and review remarks, and confirms the single Priority Score.
   - **Decline**: Updates `verificationStatus` to `DECLINED_BY_GOVT` and logs official remarks explaining why verification was declined. The problem remains active and visible in the Problem Bank.
4. **Endpoint:** `PUT /api/v1/admin/problems/:id/verify`.
5. **Success State:** Problem badge updates in real time across all institutional portals.

### 3.3 Duplicate Merge Flow
1. **Action:** Admin reviews AI-flagged duplicate candidates.
2. **Action:** Admin confirms match and clicks "Merge Problems".
3. **Endpoint:** `POST /api/v1/admin/problems/:id/merge` (Data: `targetProblemId`).
4. **Backend:** Merges records; citizens are cross-linked to the primary problem timeline without deleting submission history.

---

## 4. University Flows

### 4.1 Browse Problem Bank
1. **Action:** University coordinator navigates to the Problem Bank.
2. **Endpoint:** `GET /api/v1/problems?status=OPEN`.
3. **Display:** Full listing of all valid problems.
4. **Filter Controls:** Filter by domain, district, Priority Tier (`HIGH`, `MEDIUM`, `LOW`), and Verification Status (`All`, `Government-Verified`, `AI-Screened`).
5. **Key Rule:** Universities are fully permitted to select and propose solutions for **both** `Government-Verified` and `AI-Screened` problems.

### 4.2 Solution Proposal Submission Flow
1. **Action:** University selects any valid problem and clicks "Submit Proposal".
2. **Action:** Form fills:
   - Faculty Mentor name and email
   - Student Team Members (names, roll numbers, roles)
   - Proposed Technical Approach & Deliverables
   - Timeline Start & End dates
   - Key Milestones
   - Estimated Budget
3. **Endpoint:** `POST /api/v1/problems/:id/proposals`.
4. **Success State:** Proposal record created; Problem status updates to `PROPOSAL_SUBMITTED`.

### 4.3 Optional Verification Request Flow
1. **Action:** On an `AI-Screened` problem, university coordinator clicks "Request Govt Verification".
2. **Endpoint:** `POST /api/v1/problems/:id/request-verification`.
3. **Backend:** Sets `verificationRequested = true`, surfacing the issue to the Government Review Queue.
4. **Key Rule:** Ongoing proposal work continues with **zero disruption or delay**.

### 4.4 Progress Logging Flow
1. **Action:** For an active project, faculty mentor or student team lead clicks "Add Milestone Update".
2. **Endpoint:** `POST /api/v1/proposals/:id/progress`.
3. **Success State:** Update appears on the project timeline, visible to the citizen and government.

---

## 5. Industry Collaboration Flows

### 5.1 Browse Opportunities Flow
1. **Action:** Industry representative views the Problem Bank and active university proposals.
2. **Endpoint:** `GET /api/v1/problems` and `GET /api/v1/proposals`.

### 5.2 Register Collaboration Interest Flow
1. **Action:** Representative clicks "Register Support" on a problem or proposal.
2. **Action:** Selects support type: `MENTORSHIP`, `TECHNICAL`, `PROTOTYPING`, or `GENERAL_INTEREST`.
3. **Action:** Enters message and contact details.
4. **Endpoint:** `POST /api/v1/problems/:id/collaborate`.
5. **Success State:** Collaboration record created; University and Citizen are notified.

---

## 6. Startup & Business Builder Flows

### 6.1 Discover Commercial Opportunities Flow
1. **Action:** Startup founder browses community problems suitable for enterprise solutions.
2. **Filter:** Explores by domain, district, priority tier, and verification state.

### 6.2 Claim Problem for Commercialization Flow
1. **Action:** Founder clicks "Claim for Venture".
2. **Endpoint:** `POST /api/v1/problems/:id/claim`.
3. **Success State:** Problem marked as claimed by the startup; venture stage set to `PROBLEM_CLAIMED`.

### 6.3 Business Concept Submission Flow
1. **Action:** Founder submits structured Business Concept:
   - Solution Description
   - Target Beneficiaries & Market Size
   - Business Model & Revenue Streams
   - Operational Sustainability Model
2. **Endpoint:** `POST /api/v1/problems/:id/concepts`.
3. **Success State:** Concept saved; venture stage advances to `CONCEPT_SUBMITTED`.

### 6.4 Institutional Support Request Flow
1. **Action:** Startup requests government endorsement or university lab testing facilities.
2. **Endpoint:** `POST /api/v1/concepts/:id/support-requests`.
3. **Display:** Request surfaced to designated Government or University dashboard.

---

## 7. System / AI Pipeline Flows

```
[ Problem Record Created in DB ]
             │
             ▼
[ Step 1: Automated Relevance Filter ]
  ├── Check: Minimum length (>30 chars), gibberish patterns, promotional abuse
  └── Outcome: PASSED, FLAGGED, or FILTERED_OUT
             │ (If PASSED)
             ▼
[ Step 2: Taxonomy Categorization & Summarization ]
  ├── Assign category and subcategory
  └── Generate concise 2-sentence plain-language summary
             │
             ▼
[ Step 3: Vector Embeddings & Duplicate Check ]
  ├── Generate 1536-dimensional embedding vector
  ├── Execute pgvector cosine distance search against district problems
  └── If similarity > 0.85: Flag as potential duplicate (link IDs, never auto-reject)
             │
             ▼
[ Step 4: Priority Score Computation ]
  ├── Calculate 5 factors normalized to 0-100: Severity, Affected, Frequency, Evidence, Urgency
  ├── Execute: Priority Score = (S * 0.25) + (A * 0.25) + (F * 0.15) + (E * 0.15) + (U * 0.20)
  └── Map to Tier: HIGH (70-100), MEDIUM (40-69), LOW (0-39)
             │
             ▼
[ Step 5: Immediate Problem Bank Publication ]
  ├── Set status = OPEN, verificationStatus = AI_SCREENED
  └── Problem immediately visible to Universities, Industry, Startups
             │
             ▼
[ Step 6: Parallel Government Hook ]
  └── If Priority == HIGH -> Add to Government Review Queue
```
