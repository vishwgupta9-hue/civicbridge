# UI/UX Specification for CivicBridge

## 1. Design System & Tokens

### 1.1 Color Palette
CivicBridge employs a modern, accessible, civic-tech color palette designed for high contrast and legibility across entry-level Android devices and high-resolution desktop monitors.

```css
/* Primary Brand Palette */
--color-primary-50:  #eef2ff;
--color-primary-100: #e0e7ff;
--color-primary-500: #6366f1;
--color-primary-600: #4f46e5; /* Primary Brand Button & Accent */
--color-primary-700: #4338ca; /* Hover State */

/* Neutral Palette */
--color-neutral-50:  #f8fafc; /* Screen Background */
--color-neutral-100: #f1f5f9; /* Card Surface */
--color-neutral-200: #e2e8f0; /* Borders */
--color-neutral-300: #cbd5e1;
--color-neutral-500: #64748b; /* Muted Secondary Text */
--color-neutral-700: #334155; /* Body Text */
--color-neutral-900: #0f172a; /* Headings */

/* Semantic States */
--color-success-500: #10b981; /* Verified / Completed */
--color-warning-500: #f59e0b; /* Medium Priority / In Progress */
--color-danger-500:  #ef4444; /* High Priority / Urgent */
```

### 1.2 Typography & Sizing
- **Font Family:** `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Scale:**
  - `text-xs`: 12px (Captions, timestamps)
  - `text-sm`: 14px (Secondary text, table cells)
  - `text-base`: 16px (Body copy, form inputs — prevents iOS/Android auto-zoom)
  - `text-lg`: 18px (Card titles, section subtitles)
  - `text-xl`: 20px (Modal titles)
  - `text-2xl`: 24px (Page headers)
  - `text-3xl`: 30px (Hero section headlines)

### 1.3 Mobile-First Touch Standards
- **Touch Target Size:** Guaranteed minimum of $44 \times 44\text{ px}$ (`h-11` or `h-12` in Tailwind) for all buttons, select menus, input fields, and navigation items.
- **Form Controls:** Generous spacing (`space-y-4`), full-width single-column inputs on mobile viewports (`< 768px`).

---

## 2. Badge Architecture & Visual Indicators

CivicBridge strictly separates the **Priority Tier** (assessed societal importance) from the **Trust & Verification Status** (Government endorsement). Every problem card displays both badges side-by-side.

### 2.1 Priority Tier Badges (Single Unified Formula)
Calculated via the unified formula:
$$\text{Priority Score} = (\text{Severity} \times 0.25) + (\text{Affected People} \times 0.25) + (\text{Frequency} \times 0.15) + (\text{Evidence} \times 0.15) + (\text{Urgency} \times 0.20)$$

| Priority Tier | Score Range | Badge Styling | Visual Meaning |
|---|---|---|---|
| **HIGH** | **70.0 – 100.0** | `bg-red-100 text-red-800 border-red-300` | High societal urgency; surfaced to Government Review Queue |
| **MEDIUM** | **40.0 – 69.9** | `bg-amber-100 text-amber-800 border-amber-300` | Significant community concern; open for immediate solving |
| **LOW** | **0.0 – 39.9** | `bg-slate-100 text-slate-700 border-slate-300` | Localized or non-acute issue; open for community resolution |

*(There is NO "CRITICAL" priority badge anywhere in the system).*

### 2.2 Trust & Verification Badges (Government Endorsement)
Government verification is an independent trust signal, not an access gate.

| Verification Status | Badge Styling | Accompanying Visual Elements |
|---|---|---|
| **AI-Screened** *(Default)* | `bg-sky-100 text-sky-800 border-sky-300` | Sparkle/Robot icon + Tooltip: *"Screened by AI algorithms. Immediately actionable. Not yet verified by government."* |
| **Government-Verified** | `bg-emerald-100 text-emerald-800 border-emerald-300` | Official State Emblem / Shield icon + Tooltip: *"Independently verified and endorsed by government officials."* |
| **Declined Verification** | `bg-neutral-100 text-neutral-600 border-neutral-300` | Info icon + Popover: *"Government verification declined: [Official remarks]. Problem remains open for community solutions."* |

---

## 3. Score Presentation (Single Score Model)

- **Single Importance Score:** The **Priority Score (0–100)** is the **only** numerical score displayed for a problem.
- **No Second Verification Score:** There is no separate "official confirmation score" or "verification rating".
- **Visual Breakdown Card:** On the problem detail page, the Priority Score is displayed alongside a compact 5-bar radar/progress breakdown:
  - Severity: `[Score / 100]` (Weight: 25%)
  - Affected People: `[Score / 100]` (Weight: 25%)
  - Frequency: `[Score / 100]` (Weight: 15%)
  - Evidence Quality: `[Score / 100]` (Weight: 15%)
  - Urgency: `[Score / 100]` (Weight: 20%)

---

## 4. Problem Bank Layout & Institutional Actions

### 4.1 Header & Filter Controls
The Problem Bank (`/problems`) provides clean multi-select filter chips:
- **Verification Filter:** `All Problems` | `Government-Verified` | `AI-Screened`
- **Priority Filter:** `All Tiers` | `HIGH (70–100)` | `MEDIUM (40–69)` | `LOW (0–39)`
- **Domain Selector:** Dropdown covering Jharkhand domains (`Water & Sanitation`, `Rural Roads`, `Healthcare`, `Education`, `Agriculture`, `Power`).
- **District Selector:** Filter by any of Jharkhand's 24 districts.

### 4.2 Problem Cards (List & Grid Views)
Every card clearly presents:
1. Title & 2-sentence AI Summary
2. Priority Badge (`HIGH`, `MEDIUM`, or `LOW`) with exact score
3. Trust Badge (`Government-Verified` or `AI-Screened`)
4. Location (District & Block) and Affected Population estimate
5. Thumbnail of attached photo evidence
6. **Action Buttons (Enabled for ALL Valid Problems):**
   - For Universities: **"Submit Proposal"**
   - For Startups: **"Claim for Venture"**
   - For Industry: **"Register Support"**
   - Optional Secondary Button: **"Request Govt Verification"** (triggers review without pausing ongoing work)

---

## 5. Screen Layouts & User Interfaces

### 5.1 Citizen Mobile Submission Wizard
A responsive, multi-step mobile wizard to minimize cognitive load on small viewports:
- **Step 1: What is the problem?**
  - Title input (`h-12 text-base`)
  - Category selection grid (large touch cards with icons)
  - Detailed description text area
- **Step 2: Location & Evidence**
  - District dropdown (pre-populated with 24 Jharkhand districts)
  - GPS quick-action button: *"Use My Current Location"*
  - File uploader supporting direct mobile camera capture (`accept="image/*;capture=camera"`)
- **Step 3: Community Impact & Review**
  - Affected citizen count estimator slider
  - Frequency selector (`One-time`, `Recurring weekly`, `Daily persistent`)
  - Submit button with instant progress feedback

### 5.2 Government Admin Console
Designed for desktop productivity with information density:
- **Review Queue Table:**
  - Sorted by High-Priority items (`Score >= 70`) and institutional verification requests.
  - Columns: Date, Title, District, Citizen Evidence, AI Score, Actions.
- **Verification Modal:**
  - Displays citizen evidence side-by-side with AI triage notes.
  - 5 interactive sliders (0–100) allowing admin to confirm or adjust Severity, Affected People, Frequency, Evidence, and Urgency.
  - Automatically recalculates the single Priority Score.
  - Action buttons:
    - **"Verify Problem"**: Updates status to `GOVERNMENT_VERIFIED` and logs admin remarks.
    - **"Decline Verification"**: Prompts for mandatory rationale remarks; sets status to `DECLINED_BY_GOVT` without hiding the problem.
- **Statewide Analytics View:**
  - Recharts visualizations: Priority tier breakdown, verification status distribution, active university proposals, active startup ventures, and district map.

### 5.3 Problem Detail View (Trust & Verification Panel)
A dedicated panel displayed on every problem detail page:
- If `GOVERNMENT_VERIFIED`:
  - Emerald banner displaying: *"Government Verified on [Date] by [Official Name / Department]"*
  - Official review remarks
  - Confirmed Priority Score: `[Score] / 100` (`[Tier]`)
- If `AI_SCREENED`:
  - Sky blue banner displaying: *"AI-Screened: This problem has been filtered and categorized by automated triage. It is open for immediate university proposals and startup ventures."*
  - Button: *"Request Government Verification"* (open to registered universities and startups).
- If `DECLINED_BY_GOVT`:
  - Neutral banner displaying: *"Government Review: Verification was declined on [Date]. Reason: [Admin Remarks]. This problem remains open for community and academic solutions."*
