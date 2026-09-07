# AI Pipeline Specification

## Smart India Hackathon — Problem Statement PS 26043
### CivicBridge: Crowdsourced Societal Problem-Solving Platform for Jharkhand

**Version:** 2.0 (Parallel Trust Architecture)  
**Status:** Hackathon AI Architecture  

---

## 1. Guiding AI Principles (Mandatory from `GEMINI.md`)

1. **AI is Advisory**: AI outputs (categories, summaries, urgency, duplicate similarity) inform human decision-making and automated triage. AI never silently converts its output into a government decision.
2. **Zero Verification Gating**: AI screening immediately publishes valid problems to the Problem Bank as `AI-Screened`. Lack of government verification does not block institutional discovery or action.
3. **No Automatic Duplicate Rejection**: Duplicate similarity flags candidate problems for administrative review with a match score; it **never** automatically deletes or rejects a citizen submission.
4. **Favor Manual Review When Uncertain**: If the relevance classifier is uncertain about a submission, it marks the record as `FLAGGED_FOR_REVIEW` rather than rejecting it.
5. **Clear Visual Demarcation**: Content screened only by AI must always be transparently marked as **AI-Screened** to prevent confusion with officially **Government-Verified** problems.

---

## 2. End-to-End Triage Pipeline

```
[ Problem Submission Created ]
               │
               ▼
[ Stage 1: Relevance & Spam Screening (Hybrid Gate) ]
  ├── Rule checks: Text length (>30 chars), gibberish patterns, abuse filter
  ├── Fast LLM classifier: Valid civic/social problem vs. Spam/Nonsense
  ├── Outcome:
  │     ├── REJECTED: Blatant promotional abuse / profanity (Audit logged)
  │     ├── FLAGGED: Ambiguous / borderline text (Enqueued for Admin Triage)
  │     └── PASSED: Legitimate community problem ────┐
                                                     │
               ┌─────────────────────────────────────┘
               ▼
[ Stage 2: Categorization & 2-Sentence Summarization ]
  ├── Maps issue to Jharkhand taxonomy (Water, Roads, Education, Health, Agriculture, Power)
  └── Produces concise 2-sentence summary for rapid scanning by stakeholders
               │
               ▼
[ Stage 3: Vector Embeddings & Duplicate Detection ]
  ├── Generates 1536-dimensional embedding vector (text-embedding-3-small)
  ├── Queries PostgreSQL via pgvector: Cosine distance `<=>` against district problems
  └── If similarity > 0.85: Flags `isDuplicate = true` and links matching IDs (Never auto-rejects)
               │
               ▼
[ Stage 4: Priority Score Calculation (Exact Unified Formula) ]
  ├── Evaluates 5 normalized dimensions (0 - 100):
  │     • Severity (25%)
  │     • Affected People (25%)
  │     • Frequency (15%)
  │     • Evidence Quality (15%)
  │     • Urgency (20%)
  ├── Priority Score = (S * 0.25) + (A * 0.25) + (F * 0.15) + (E * 0.15) + (U * 0.20)
  └── Maps strictly to 3 Tiers: HIGH (70-100), MEDIUM (40-69), LOW (0-39)
               │
               ▼
[ Stage 5: Immediate Problem Bank Publication ]
  ├── Sets status = OPEN, verificationStatus = AI_SCREENED
  └── Instantly visible to Universities, Industry, and Startups
               │
               ▼
[ Stage 6: Parallel Government Queue Placement ]
  └── If Priority == HIGH (Score >= 70): Enqueues in Government Review Queue
```

---

## 3. Detailed Component Specifications

### 3.1 Stage 1: Relevance & Spam Filter
- **Input:** `title`, `description`, `evidenceUrl`.
- **System Prompt:**
  ```text
  You are an AI screener for CivicBridge Jharkhand. Determine if the text represents a genuine 
  civic, environmental, infrastructural, agricultural, or social issue in a community.
  Reject promotional marketing, personal hate speech, or pure gibberish.
  Respond ONLY with JSON: {"status": "PASSED" | "REJECTED" | "FLAGGED", "reason": "..."}
  ```
- **Failsafe Rule:** If confidence is $< 0.75$, output `FLAGGED` to allow human verification.

### 3.2 Stage 2: Categorization & Summarization
- **Predefined Taxonomies:**
  - Water & Sanitation
  - Rural Roads & Transport
  - Public Healthcare & Clinics
  - Primary & Secondary Education
  - Agriculture & Irrigation
  - Power & Renewable Energy
  - Environment & Forest Conservation
- **Summary Format:** Exactly 2 sentences capturing: (1) what the core issue is and where, (2) the direct impact on local residents.

### 3.3 Stage 3: Vector Cosine Duplicate Search
- **Embedding Generation:** 1536-dimensional vector stored in `AIAnalysis.embedding` (`vector(1536)`).
- **SQL Similarity Query:**
  ```sql
  SELECT p.id, p.title, 1 - (a.embedding <=> $1) AS similarity
  FROM "AIAnalysis" a
  JOIN "Problem" p ON a."problemId" = p.id
  WHERE p.district = $2 AND p.id != $3 AND (1 - (a.embedding <=> $1)) > 0.85
  ORDER BY similarity DESC
  LIMIT 5;
  ```
- **Behavior:** If matches are found, sets `isDuplicate = true` and populates `similarProblemIds = [id1, id2]`. Does **not** reject the problem.

### 3.4 Stage 4: Priority Score Calculation
$$\text{Priority Score} = (\text{Severity} \times 0.25) + (\text{Affected People} \times 0.25) + (\text{Frequency} \times 0.15) + (\text{Evidence} \times 0.15) + (\text{Urgency} \times 0.20)$$

#### Factor Normalization Scale (0 – 100):
| Dimension | Weight | Evaluation Criteria |
|---|---|---|
| **Severity** | **25%** | Hazard level to health, safety, or basic livelihood (Minor = 20, Moderate = 50, Severe = 80, Life-Threatening = 100) |
| **Affected People** | **25%** | Population scale ($<10$ people = 20, $10-50$ = 40, $50-200$ = 60, $200-1000$ = 80, $>1000$ = 100) |
| **Frequency** | **15%** | Recurrence rate (One-off occurrence = 25, Occasional/Monthly = 50, Weekly/Persistent = 75, Constant/Daily = 100) |
| **Evidence** | **15%** | Supporting documentation (No media = 20, Clear photo = 60, Photo + GPS coords = 80, Photo + Docs + GPS = 100) |
| **Urgency** | **20%** | Time criticality assessed by LLM (Low urgency = 25, Standard = 50, Urgent = 75, Immediate danger = 100) |

#### Exact Three-Tier Mapping:
- **HIGH**: **70.0 – 100.0** (Prominently highlighted; automatically enqueued in Government Review Queue)
- **MEDIUM**: **40.0 – 69.9** (Standard community challenge; open for immediate institutional action)
- **LOW**: **0.0 – 39.9** (Minor or localized issue; open for immediate institutional action)

*(There is NO "CRITICAL" tier).*

---

## 4. Single Score & Verification Architecture

- **No Second AI Verification Score:** The AI pipeline produces exactly **one** numerical metric: the `Priority Score (0–100)`.
- **Government Action:** When a government official reviews the problem, the official confirms or refines the 5 normalized factors, updating the **same** single Priority Score and toggling `verificationStatus` to `GOVERNMENT_VERIFIED` or `DECLINED_BY_GOVT`.

---

## 5. Offline Heuristic Fallback Mock Engine

To ensure flawless, zero-downtime hackathon demonstrations and local offline execution:
- If `OPENAI_API_KEY` or `GEMINI_API_KEY` is not provided or rate-limited:
  - System automatically activates `MockAIService`.
  - **Relevance:** Uses regex pattern matching against spam keyword dictionaries.
  - **Categorization:** Uses keyword matching against predefined domain taxonomies.
  - **Summarization:** Extracts first two sentences of description text.
  - **Vector Similarity:** Computes Jaccard/Levenshtein token overlap.
  - **Priority Score:** Computes the exact 25/25/15/15/20 formula based on affected population counts and evidence presence.
