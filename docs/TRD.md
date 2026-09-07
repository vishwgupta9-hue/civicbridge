# Technical Requirements Document (TRD)

## Smart India Hackathon — Problem Statement PS 26043
### CivicBridge: Crowdsourced Societal Problem-Solving Platform for Jharkhand

**Version:** 2.0 (Parallel Trust Architecture)  
**Status:** Hackathon Technical Architecture  

---

## 1. System Architecture Overview

CivicBridge is designed as a decoupled, type-safe web platform emphasizing mobile-first responsiveness, asynchronous AI triage, and zero-gate institutional access.

```
                             [ React 18 + Vite Frontend ]
                                          │
                                          │ (HTTP / JSON / JWT)
                                          ▼
                         [ Express.js + TypeScript API Server ]
      ┌───────────────────────────────────┼───────────────────────────────────┐
      ▼                                   ▼                                   ▼
[ Security & Auth ]              [ Business Services ]               [ AI & Storage ]
- JWT Bearer Auth                - ProblemService                    - AIService (LLM + Vector)
- 5-Role Guard Middleware        - ValidationService                 - StorageService (Cloudinary / Disk)
- Helmet / CORS / RateLimit      - ProposalService                   - Offline Mock AI Fallback
- Zod Request Validation         - StartupService                    
      └───────────────────────────────────┼───────────────────────────────────┘
                                          ▼
                                [ Prisma ORM Client ]
                                          ▼
                         [ PostgreSQL 15 + pgvector Database ]
```

---

## 2. Technology Stack

| Component | Technology | Version | Purpose & Rationale |
|---|---|---|---|
| **Frontend Framework** | React.js | 18.x | Dynamic component-driven UI, broad ecosystem |
| **Frontend Tooling** | Vite | 5.x | Instant HMR, rapid development, optimized build output |
| **Styling** | Tailwind CSS | 3.4.x | Mobile-first utility design, guaranteed 44px touch targets |
| **Icons** | Lucide React | 0.3x | Consistent, lightweight iconography |
| **Form Validation** | React Hook Form + Zod | 7.x / 3.x | Zero re-render form state with shared type-safe schemas |
| **Charts & Maps** | Recharts + Leaflet | 2.x / 1.9.x | Government dashboard data viz and Jharkhand mapping |
| **Backend Runtime** | Node.js (LTS) | 20.x | High-throughput asynchronous event handling |
| **Backend Framework**| Express.js | 4.x | Lightweight, robust REST routing |
| **Language** | TypeScript | 5.x | End-to-end type safety between API and client |
| **Database** | PostgreSQL + pgvector | 15.x | Relational integrity with native vector embeddings |
| **ORM** | Prisma | 5.x | Type-safe queries, automated migrations, seed scripts |
| **AI / NLP** | OpenAI / Google Gemini | SDK | Relevance filter, summary, category, vector similarity |
| **Media Storage** | Cloudinary / Local Disk | SDK | Evidence photo and PDF storage with local fallback |
| **Security** | JWT + bcryptjs | 9.x / 2.4.x | Stateless auth tokens and 12-round password hashing |

---

## 3. Priority Score & Single Score Architecture

The platform strictly implements **one unified formula** for problem prioritization.

### 3.1 Unified Formula
$$\text{Priority Score} = (\text{Severity} \times 0.25) + (\text{Affected People} \times 0.25) + (\text{Frequency} \times 0.15) + (\text{Evidence} \times 0.15) + (\text{Urgency} \times 0.20)$$

* Each factor is normalized on a **0.0 – 100.0 scale**.
* Priority Tiers:
  - **HIGH**: 70.0 – 100.0
  - **MEDIUM**: 40.0 – 69.9
  - **LOW**: 0.0 – 39.9
* **No `CRITICAL` tier exists anywhere in the codebase.**

### 3.2 Single Score Rule
* There is **no separate numerical "Government Verification Score"**.
* The Priority Score is the sole importance metric.
* Government verification updates the verification trust status (`AI_SCREENED`, `GOVERNMENT_VERIFIED`, or `DECLINED_BY_GOVT`), records the verifying official ID, verification timestamp, and official remarks, and confirms/refines the Priority Score.

---

## 4. API Endpoints Specification

### 4.1 Authentication Endpoints
- `POST /api/v1/auth/register`
  - Body: `{ name, email, password, phone, role, district, organizationData? }`
  - Roles: `CITIZEN`, `ADMIN`, `UNIVERSITY`, `INDUSTRY`, `STARTUP`.
- `POST /api/v1/auth/login`
  - Body: `{ email, password }`
  - Returns: `{ token, user: { id, name, email, role, district, organizationId } }`
- `GET /api/v1/auth/me`
  - Headers: `Authorization: Bearer <token>`

### 4.2 Problem Endpoints (Zero Verification Gate)
- `GET /api/v1/problems`
  - Query Params:
    - `verificationStatus`: `AI_SCREENED` | `GOVERNMENT_VERIFIED` | `DECLINED_BY_GOVT` (optional filter)
    - `priorityTier`: `HIGH` | `MEDIUM` | `LOW` (optional filter)
    - `district`: string (optional)
    - `category`: string (optional)
  - Returns all valid problems (`filterStatus = PASSED`). No verification gate.
- `POST /api/v1/problems`
  - Form-data: `title, description, category, district, affectedCount, evidenceFile`
  - Triggers AI Pipeline:
    1. Relevance check (rejects spam, flags uncertain).
    2. Categorization & 2-sentence summary.
    3. Vector embeddings & cosine duplicate search (`<=>` distance in pgvector).
    4. Exact Priority Score computation (0–100) & tier assignment.
    5. Saves with `status: OPEN` and `verificationStatus: AI_SCREENED`.
    6. If Priority == `HIGH`: Enqueues to Government Review Queue in parallel.
  - Returns: Created Problem record.
- `GET /api/v1/problems/:id`
  - Returns full problem details, AI summary, single Priority Score breakdown, attached evidence, and Government Trust & Verification panel.
- `POST /api/v1/problems/:id/request-verification`
  - Headers: `Authorization: Bearer <token>` (Role: `UNIVERSITY`, `STARTUP`, or `INDUSTRY`)
  - Updates `verificationRequested = true` on the problem without pausing or blocking any active work.

### 4.3 University Endpoints
- `POST /api/v1/problems/:id/proposals`
  - Headers: `Authorization: Bearer <token>` (Role: `UNIVERSITY`)
  - Body: `{ facultyMentor, teamMembers: [], proposedApproach, deliverables, timelineStart, timelineEnd, milestones: [], budget? }`
  - **Permission:** Allowed on **both** `Government-Verified` and `AI-Screened` problems.
  - Updates problem status to `PROPOSAL_SUBMITTED`.
- `POST /api/v1/proposals/:id/progress`
  - Body: `{ milestoneTitle, updateText, attachmentUrl? }`

### 4.4 Startup Endpoints
- `POST /api/v1/problems/:id/claim`
  - Headers: `Authorization: Bearer <token>` (Role: `STARTUP`)
  - Marks intent to commercialize. Allowed on **both** `Government-Verified` and `AI-Screened` problems.
- `POST /api/v1/problems/:id/concepts`
  - Body: `{ solutionDescription, targetBeneficiaries, marketSize, businessModel, revenueModel, sustainabilityModel }`
  - Advances venture stage to `CONCEPT_SUBMITTED`.
- `POST /api/v1/concepts/:id/support-requests`
  - Body: `{ requestedFrom: 'ADMIN' | 'UNIVERSITY' | 'INDUSTRY', requestType, details }`

### 4.5 Industry Endpoints
- `POST /api/v1/problems/:id/collaborate`
  - Headers: `Authorization: Bearer <token>` (Role: `INDUSTRY`)
  - Body: `{ supportType: 'MENTORSHIP' | 'TECHNICAL' | 'PROTOTYPING' | 'GENERAL_INTEREST', message }`
  - Allowed on any valid problem or active proposal.

### 4.6 Government / Admin Endpoints
- `GET /api/v1/admin/review-queue`
  - Returns High-Priority problems (`priorityScore >= 70`) and problems with `verificationRequested = true`.
- `PUT /api/v1/admin/problems/:id/verify`
  - Headers: `Authorization: Bearer <token>` (Role: `ADMIN`)
  - Body: `{ severityScore, affectedScore, frequencyScore, evidenceScore, urgencyScore, decision: 'GOVERNMENT_VERIFIED' | 'DECLINED_BY_GOVT', remarks }`
  - Calculates confirmed Priority Score using the exact 25/25/15/15/20 formula.
  - Updates problem's `priorityScore`, `priorityTier`, and `verificationStatus`.
  - Records verifying official ID and verification timestamp.
- `POST /api/v1/admin/problems/:id/merge`
  - Body: `{ primaryProblemId, duplicateProblemId }`
- `GET /api/v1/admin/stats`
  - Returns aggregate counts for district heatmaps, priority tiers, verification states, active university proposals, and startup ventures.

---

## 5. Security & Role-Based Access Control (RBAC)

- **Authentication:** Stateless JSON Web Tokens (JWT) passed via `Authorization: Bearer <token>`.
- **Role Verification Middleware:**
  ```typescript
  export const requireRole = (allowedRoles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Access forbidden: Insufficient role privileges' });
      }
      next();
    };
  };
  ```
- **Input Sanitization & Validation:** All incoming mutation bodies are validated server-side using Zod schemas.
- **Secrets Management:** Secrets (JWT secret, DB URL, AI API keys, Cloudinary credentials) are strictly stored in `.env` and never leaked in client-side bundles.
