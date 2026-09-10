# CivicBridge V3 — Product Experience & Stakeholder Design Specification

## Purpose

This document is the product source of truth for the next CivicBridge V3 improvement phase.

CivicBridge is an evolution of the existing V2/V3 platform, not a rewrite. The technical foundation already includes problem intelligence, AI screening, organizations, projects, needs, offers, matching, collaborations, milestones, pilots, metrics, verification, and impact dossiers.

The goal now is to turn those capabilities into a coherent, valuable multi-stakeholder product.

## Core Product

CivicBridge is:

> A coordinated civic problem-solving ecosystem where real problems are discovered, understood, connected with capable organizations, turned into projects, piloted in the field, and measured for impact.

Core loop:

Problem
→ Community Ground Truth
→ Problem Intelligence
→ Stakeholder Discovery
→ Project / Solution Proposal
→ Resource & Partner Matching
→ Collaboration
→ Project Execution
→ Pilot
→ Outcome Verification
→ Impact Evidence

This is not a rigid linear workflow. Stakeholders may enter at different points.

---

# 1. Non-Negotiable Product Principles

1. Preserve the existing V2/V3 architecture unless a change is genuinely required.
2. V3 is an evolution, not a rewrite.
3. Reuse existing APIs, services, entities, and matching logic wherever possible.
4. Do not create duplicate entities, workflows, matching systems, or APIs.
5. Keep one shared Problem Bank, but expose role-specific actions and context.
6. Government verification is a trust signal, not a gate.
7. Collaboration is a structured commitment, not generic social networking.
8. Resource Exchange is a capability/resource matching system, not e-commerce.
9. Projects should feel like real proposals and delivery vehicles, not database records.
10. Dashboards must be action-oriented rather than vanity-metric dashboards.
11. Empty states should explain value and provide a next action.
12. Seed data must demonstrate connected cross-stakeholder journeys.
13. Do not add chat, payments, blockchain, gamification, generic social features, or a Jira clone.
14. Do not add AI merely for appearance.
15. Prioritize valuable features, collaboration, completion, and reliability over minor polish.

---

# 2. Existing Capabilities to Preserve

- Citizen problem submission
- Evidence upload
- AI screening/classification
- Problem DNA / root causes
- 5-factor priority scoring
- Embeddings and semantic duplicate detection
- Community validation
- Government verification/review
- Problem Bank
- Organizations
- Projects
- Project ↔ Problem relationships
- Needs
- Offers
- Matching
- Collaborations
- Milestones
- Progress updates
- Pilot deployment
- Conditional pilot clearance / NOC workflow
- Pilot metrics
- Multi-stakeholder verification
- Impact Dossier

Roles:
- CITIZEN
- ADMIN / GOVERNMENT
- UNIVERSITY
- STARTUP
- INDUSTRY

---

# 3. Stakeholder Objectives

## Citizen / Community

Core job:

> Surface ground truth and know whether the problem actually improved.

Citizen capabilities:
- Report problems
- Add evidence
- Confirm a problem affects them
- Add local context
- Follow progress
- See solver/project activity
- Participate in outcome verification

Core question:

> Is this problem real, and did it actually improve?

## Government

Core job:

> Understand, prioritize, coordinate, and oversee public outcomes.

Government capabilities:
- Review problem evidence
- Add official context
- Verify / request more information / decline verification
- Identify solvers
- View projects
- Coordinate where necessary
- Review pilot/clearance requests
- Review measured outcomes
- Understand district-level patterns

Core question:

> What requires attention, who is working on it, and what is happening on the ground?

## University / HEI

Core job:

> Convert real-world problems into research, projects, prototypes, pilots, and research outputs.

Needs:
- Authentic problems
- Evidence
- Research context
- Students/faculty
- Industry capabilities
- Resources
- Pilot sites
- Government context

Core question:

> Can we research, build, test, and demonstrate an intervention?

## Startup

Core job:

> Discover validated unmet demand and turn it into a viable product/service and pilot.

Needs:
- Validated problems
- Evidence
- Affected population
- Government context
- Existing projects/research
- Industry capabilities
- Pilot opportunities
- Partnership opportunities

Core question:

> Can we build a viable product/service around solving this?

## Industry

Core job:

> Deploy technical capabilities, infrastructure, manufacturing, testing, expertise, technology, and resources where they create value.

Industry is NOT merely a CSR donor.

Capabilities may include:
- Testing
- Manufacturing
- Engineering
- Equipment
- Labs
- Technical expertise
- Mentorship
- Components
- Field capability
- Infrastructure
- Technology

Core question:

> Can our capabilities help implement, validate, or scale this?

---

# 4. Citizen Experience

## Citizen Dashboard

Primary sections:

### My Problems
Show:
- Problem title
- Location
- Priority
- Community confirmations
- Government review
- Active project
- Solver activity
- Pilot status
- Latest progress

Primary action:
> View Progress

### Community Activity
Show:
- Confirmations
- Local context
- Evidence additions
- Important updates

### Outcome Verification
Show completed pilots where citizens can verify whether the problem improved.

Do not make the dashboard primarily about generic statistics.

## Citizen Problem Page

Actions:
- Me Too / Confirm
- Add Evidence
- Add Local Context
- Follow Progress
- View Solvers
- View Projects
- View Pilot
- Verify Outcome when eligible

Community context should be structured, useful evidence rather than social media.

Example:
- “I have observed this for approximately 6 months.”
- “The issue becomes worse during monsoon.”

## Citizen Timeline

Problem reported
→ AI screened
→ Community evidence
→ Government review
→ Solver/project activity
→ Collaboration
→ Pilot
→ Outcome

Make progress understandable to a non-technical citizen.

---

# 5. Government Experience

## Government Dashboard

Primary sections:

### Needs Attention
- High-priority problems requiring review
- Problems with new evidence
- Projects requiring government context
- Pilot clearance requests
- Outcomes awaiting review

### Problem Intelligence
Use the same Problem Bank with government-specific actions.

### Solution / Project Activity
Show:
- Active projects
- Organizations working on problems
- Project stage
- Milestones
- Pilot readiness

### Pilot & Outcomes
Show:
- Pending pilot requests
- Active pilots
- Outcomes ready for review
- Verified impact

### Quick Actions
- Review high-priority problem
- Review evidence
- Review project
- Review pilot clearance
- Review outcome

## Government Problem Actions

Same Problem Bank.

Government actions:
- Review
- Verify
- Request More Information
- Decline Verification
- View Evidence
- View Solvers
- View Projects
- Coordinate Pilot
- Review Outcome

Do not create a separate Government Problem Bank.

## Government Decline UX

Do NOT display confusing wording such as:

> Govt Declined (Active)

Use:

> Government Review: Not Verified

Explanation:

> The problem was reviewed by a government authority but was not verified. It remains visible because government verification is a trust signal, not a requirement for civic action.

The problem remains available for community, university, startup, or industry action.

## Government Project Review

Government should be able to inspect:
- Project title
- Linked problem
- Problem statement
- Evidence
- Lead organization
- Team
- Project track
- Executive summary
- Proposed solution
- Technical / delivery approach
- Partners
- Needs
- Offers
- Milestones
- Pilot plan
- Beneficiaries
- Expected outcomes
- Current status

Actions:
- Review project
- View pilot
- View partners
- View progress
- Coordinate where applicable

Government does not automatically approve the technical solution.

## Government Pilot Desk

Show:
- Pilot
- Problem
- Project
- Lead organization
- Site
- Beneficiaries
- Dates
- Clearance requirement
- Clearance status
- Documents

Actions:
- Review
- Approve where authorized
- Request changes/information
- Decline

CivicBridge manages the workflow; authorized government users make the actual decision.

## Government Outcome Desk

Show:
- Baseline
- Target
- Outcome
- Unit
- Measurement date
- Evidence
- Verification status
- Verifiers

Action:
> View Impact Dossier

---

# 6. University Experience

## University Dashboard

### Research Opportunities
Show:
- High-priority problems
- Problems matching university capabilities
- Problems with strong evidence
- Problems without active projects
- Problems suitable for research

### My Projects
Show:
- Project status
- Team
- Faculty mentor
- Milestones
- Partners
- Pilot

### Resources Needed
Show:
- Lab
- Testing
- Equipment
- Site access
- Expertise
- Components

### Collaboration Opportunities
Show:
- Industry partners
- Startup partners
- Government context
- Other organizations

## University Opportunity Card

Example:

Water Quality Monitoring
East Singhbhum
Priority: HIGH
1,500 affected
Strong evidence

Potential research:
Environmental sensing

Actions:
- Explore Problem
- Propose Project
- Find Industry Partner
- Find Resources

## University Project Proposal

The current basic form must become a serious proposal experience.

Sections:

1. Problem
   - Automatically linked problem.

2. Problem Understanding
   - Context
   - Evidence
   - Root causes where available

3. Proposed Solution
   - What is being proposed?

4. Research / Technical Approach
   - Methodology
   - Technical approach

5. Team
   - Faculty mentor
   - Students
   - Department

6. Expected Deliverables
   - Prototype
   - Research report
   - Dataset
   - Field study
   - Technology

7. Resources Required
   - Lab testing
   - Equipment
   - Industry expertise
   - Site access
   - Data

8. Partners Required
   Example:
   “Looking for environmental testing partner.”

9. Pilot Plan
   - Site
   - Duration
   - Beneficiaries
   - Preparation

10. Expected Impact
   - Metrics
   - Target
   - Expected result

Primary CTA:
> Submit Project Proposal

## University Project Workspace

Sections:
- Problem
- Research objective
- Proposed approach
- Team
- Partners
- Resources
- Milestones
- Pilot
- Outcomes

Example milestones:
- Literature Review ✓
- Prototype ✓
- Lab Testing ✓
- Field Testing →
- Pilot ○
- Impact Evaluation ○

---

# 7. Startup Experience

## Startup Dashboard

### Validated Opportunities

Prioritize/display opportunities using:
- Priority
- Evidence
- Affected population
- Government context
- Existing solver activity
- Pilot readiness
- Potential market/use case

### My Projects

### Pilot Opportunities

### Partners

## Startup Opportunity Page

Show:
- Problem
- Evidence
- Affected population
- Existing interventions
- Existing projects
- University research
- Unmet Needs
- Government context
- Pilot opportunity
- Potential users/customers

Actions:
- Explore Opportunity
- Build Project
- Find Partners
- View Pilot Opportunity

## Startup Pilot Reference

After a successful pilot, present a factual impact record:

CivicBridge Pilot
Problem:
Water Quality

Location:
East Singhbhum

Beneficiaries:
1,500

Outcome:
Target achieved

Verified by:
Government
University
Community

This is evidence, not a vanity badge.

---

# 8. Industry Experience

## Industry Dashboard

Primary section:

### Projects Seeking Industry Capability

Example:

Water Quality Monitoring
University: BIT Mesra
Need: Environmental Testing
Location: East Singhbhum
Stage: Prototype

Actions:
- View Project
- Offer Capability
- Request Technical Collaboration

### Capability Opportunities
Show areas where industry capabilities can help.

## Industry Capability Profile

Include:
- Capabilities
- Equipment / Facilities
- Expertise
- Industries Served
- Geographic Coverage
- Projects Supported
- Outcomes

Example capabilities:
- Environmental Testing
- IoT Hardware
- Manufacturing
- Field Engineering
- Product Certification
- Technical Mentorship

## Industry Offer

Example:

Environmental Testing Facility
Provider: ABC Industries
Capability: Water quality analysis
Location: Ranchi
Available for: Academic + Startup projects
Capacity: 5 projects / quarter
Requirements: Sample collection protocol

Action:
> Offer to Project

Then:
> Request Collaboration

---

# 9. Role-Aware Problem Actions

The underlying problem remains shared.

## Citizen
- Me Too
- Add Evidence
- Add Context
- Follow Progress
- Verify Outcome

## Government
- Review
- Verify
- Request Information
- Decline Verification
- View Solvers
- View Projects
- Coordinate Pilot
- Review Outcome

## University
- Explore Research
- Propose Project
- Find Industry Partner
- Find Resources

## Startup
- Explore Opportunity
- Build Project
- Find Partners
- View Pilot Opportunity

## Industry
- View Projects
- Offer Capability
- Technical Support
- Find Collaboration

The Problem Bank remains common.

---

# 10. Resource Exchange

Prefer UI wording:

> Capability & Resource Exchange

It is NOT an e-commerce marketplace.

## Needs

Initial categories:
- LAB_EQUIPMENT
- TESTING_ANALYSIS
- MANUFACTURING_FABRICATION
- FACILITY_SITE_ACCESS
- DOMAIN_EXPERTISE_MENTORSHIP
- HARDWARE_COMPONENTS

## Offers

Same categories.

## Example Need

University:
Water testing

Project:
Water Quality Monitoring

Need:
ICP-MS / chemical analysis

Location:
East Singhbhum

## Example Offer

Industry:
Environmental laboratory

Capability:
Water quality analysis

Location:
Ranchi

Available capacity:
5 projects / quarter

## Matching Result

92% Match

Reasons:
- Capability match
- Geographic match
- Project context match
- Cross-sector compatibility

Action:
> Request Collaboration

Reuse existing matching services.

---

# 11. Collaboration

Do NOT create generic chat.

Collaboration is a structured commitment.

## Connection Request

Example:

BIT Mesra
wants to collaborate with
ABC Industries

Project:
Water Quality Monitoring

Need:
Environmental Testing

Requested contribution:
Laboratory analysis

Expected duration:
3 months

Actions:
- Accept
- Decline

## Collaboration Workspace

Show:
- Organizations
- Problem
- Project
- Need
- Offer
- Commitment
- Status
- Progress

Lifecycle:
EXPLORING
→ ACCEPTED
→ ACTIVE
→ COMPLETED

Preserve existing supported terminal states where applicable.

---

# 12. Organization Profile

Order:

1. Capabilities
2. Active Projects
3. Problems Addressed
4. Current Needs
5. Available Offers
6. Active Collaborations

Contextual CTA:
> Explore Capabilities

or:
> Request Collaboration

---

# 13. Project Experience

A project must look like a real delivery/research vehicle.

## Project Header
- Title
- Lead organization
- Track
- Status
- Linked problem(s)

## Problem
- Problem statement
- Evidence
- Priority
- Community context

## Proposal / Approach
- Executive summary
- Proposed solution
- Technical approach

## Team
- Lead
- Members
- Faculty/technical roles where applicable

## Partners
- Organizations
- Collaborations

## Resources
- Needs
- Offers

## Milestones
- Deliverables
- Deadlines
- Progress

## Pilot
- Site
- Beneficiaries
- Dates
- Clearance
- Metrics

## Outcomes
- Baseline
- Target
- Outcome
- Evidence
- Verification
- Impact Dossier

The page should visually resemble a professional proposal/project workspace, not a CRUD record.

---

# 14. Dashboard Design Rule

Every dashboard must answer:

1. What needs my attention?
2. What opportunities are relevant to me?
3. What am I currently working on?
4. Who do I need to connect with?
5. What should I do next?

Metrics can exist but should support decisions.

Five dashboard identities:

### Citizen
> Your Problems

### Government
> Needs Attention

### University
> Research Opportunities

### Startup
> Validated Opportunities

### Industry
> Projects Seeking Capability

Dashboards must not be the same template with different colors/titles.

---

# 15. Next-Action Experience

Surface useful actions.

Citizen:
> Add evidence to your reported problem.

Government:
> 4 high-priority problems require review.

University:
> 7 problems match your research capabilities.

Startup:
> 3 validated problems have pilot potential.

Industry:
> 5 projects need your capabilities.

---

# 16. Activity / Notifications

No real-time chat required.

Useful events:
- Your problem received new confirmations.
- A university proposed a project for your problem.
- An industry organization offered a capability.
- Your collaboration request was accepted.
- A pilot was created.
- A pilot outcome is ready for verification.

---

# 17. Trust / Evidence UX

Important objects should expose factual trust context.

Problem:
- AI Screened
- Community Evidence
- Government Review

Project:
- Lead organization
- Problem evidence
- Partners
- Pilot state

Outcome:
- Baseline
- Target
- Measured result
- Evidence
- Verified by

Do not create trust badges without underlying factual data.

---

# 18. Navigation

Navigation should be role-aware but compact.

## Citizen
- Problem Bank
- My Problems
- Report Problem

## Government
- Problem Intelligence
- Projects
- Pilots
- Outcomes
- Organizations

## University
- Problem Bank
- Research Opportunities
- My Projects
- Resources
- Collaborations

## Startup
- Opportunities
- My Projects
- Partners
- Pilots

## Industry
- Opportunities
- Capabilities
- Projects
- Collaborations

---

# 19. Empty States

Never make empty data look like a broken product.

Bad:
> Needs: 0

Good:
> No active resource needs yet. Organizations can post lab, testing, equipment, manufacturing, site-access, expertise, or component requirements here.

CTA:
> Create a Need

No Offers:
> No capability offers are currently available. Organizations can publish capabilities that can support civic projects.

CTA:
> Publish Capability

---

# 20. Seed Data Strategy

Seed data is essential.

Do NOT create random disconnected records.

Create 3–5 connected civic ecosystems.

## Story 1 — Water

Citizen Problem
→ Community validation
→ University project
→ University Need: Water testing
→ Industry Offer: Environmental testing
→ Collaboration
→ Startup involvement
→ Pilot
→ Government review/clearance
→ Measured outcome
→ Community verification
→ Impact Dossier

## Story 2 — Agriculture

Problem
→ Startup project
→ Industry sensor capability
→ Pilot

## Story 3 — Waste

Problem
→ University research
→ Industry support
→ Project
→ Pilot

## Story 4 — Rural Infrastructure

Problem
→ Government context
→ University
→ Startup
→ Industry capability
→ Pilot

Each role should immediately see meaningful data after login.

Seed data must be realistic, internally consistent, and connected.

---

# 21. Keep

Keep:
- AI screening
- Problem DNA
- Priority scoring
- Community validation
- Government review
- Problems
- Organizations
- Projects
- Needs
- Offers
- Matching
- Collaborations
- Milestones
- Progress
- Pilots
- Metrics
- Verification
- Impact Dossier
- Existing five-role architecture

---

# 22. Improve

Improve:
- Citizen comments/local context
- Citizen progress tracking
- Problem role-specific actions
- Government intelligence workspace
- Government project review
- Government pilot/outcome visibility
- University research opportunity experience
- University proposal UX
- University project workspace
- Startup opportunity experience
- Startup pilot/proof-of-impact experience
- Industry capability experience
- Industry project opportunities
- Resource Exchange
- Connection request exposure
- Collaboration UX
- Organization profiles
- Project details
- Dashboard differentiation
- Empty states
- Activity/notifications
- Connected seed data

---

# 23. Explicitly Do Not Add

- Generic real-time chat
- Payments
- Escrow
- Open e-commerce marketplace
- Blockchain
- Gamification
- Likes/follows/social feed
- Complex ontology
- Microservices
- Jira/Trello clone
- Grant management unless specifically required later
- Automated government decisions
- Automatic duplicate deletion
- Additional stakeholder roles without strong justification
- New AI systems merely for appearance

---

# 24. Implementation Priority

## P0 — Production Reliability

Fix current production API/routing failures:
- Citizen report loading 404
- Resource Exchange JSON/HTML error
- University dashboard 404
- Startup dashboard 404
- Project creation JSON/HTML error
- Any similar frontend/backend API mismatch

Do not redesign product while core API calls are broken.

## P1 — Stakeholder Experience

Redesign the five stakeholder experiences:
- Citizen
- Government
- University
- Startup
- Industry

Use the existing Problem Bank and role-specific actions.

## P2 — Project / Proposal Experience

Improve:
- University proposal
- Startup project proposal
- Industry project view
- Government project review

Project must feel like a real proposal and delivery vehicle.

## P3 — Collaboration Experience

Make this journey obvious:

Problem
→ Find Solvers
→ Organization
→ Project
→ Find Partners
→ Need / Offer
→ Match
→ Request Collaboration
→ Collaboration Workspace

## P4 — Resource Exchange

Make this journey work:

Need
→ Matching Offer
→ Relevant Project
→ Request Collaboration

Do not turn it into e-commerce.

## P5 — Connected Seed Ecosystem

Create 3–5 connected stories so every dashboard and feature has meaningful data.

## P6 — Final Experience

Improve:
- Empty states
- Next actions
- Activity
- Error states
- Navigation
- Visual hierarchy
- Demo consistency

Do not chase minor visual polish before core flows work.

---

# 25. Golden Demo Journey

The platform should demonstrate:

Citizen reports:
“Severe Chemical Runoff and Toxic Water Discoloration”

↓
Community confirms and adds evidence

↓
AI generates:
- Classification
- Root causes
- Priority score

↓
University discovers problem

↓
University creates a serious project proposal

↓
University posts Need:
Water Quality Testing

↓
Industry has Offer:
Environmental Testing Facility

↓
System shows relevant match

↓
University requests collaboration

↓
Industry accepts

↓
Startup discovers opportunity / joins where appropriate

↓
Project progresses through milestones

↓
Pilot is created

↓
Government reviews/coordinates clearance where required

↓
Pilot runs

↓
Baseline and outcome metrics are recorded

↓
University / Industry / Government verify outcome

↓
Citizens provide ground-truth outcome verification

↓
Impact Dossier summarizes measurable result

This should be the central CivicBridge story.

---

# 26. Antigravity Implementation Rules

IMPORTANT:
This document is a product specification, not blanket permission to implement everything.

Before implementation:
- Review current code and architecture.
- Identify what already exists.
- Map existing features to this specification.
- Do not recreate existing functionality.

For implementation:
- Make changes only when explicitly instructed.
- Prefer existing APIs/services/components.
- Avoid unnecessary schema changes.
- Avoid duplicate endpoints.
- Avoid duplicate matching logic.
- Preserve V2 behavior.
- Preserve the existing AI pipeline.
- Preserve government verification as a non-blocking trust signal.
- Preserve role guards and permissions.

After each implementation phase:
1. Inspect changes.
2. Run only necessary checks.
3. Verify the affected user flow.
4. Review for accidental feature removal.
5. Stop and report before proceeding.

Do not automatically continue through all phases.

---

# 27. Definition of Done

Citizen:
Can report, validate, follow, understand solver activity, and verify outcomes.

Government:
Can review problems, see evidence, inspect projects, coordinate pilots, and review outcomes.

University:
Can discover authentic research opportunities, submit serious proposals, find partners/resources, execute milestones, and pilot.

Startup:
Can discover validated opportunities, understand evidence/demand, build projects, find partners, and participate in pilots.

Industry:
Can publish meaningful capabilities, discover projects needing those capabilities, offer support, collaborate, and see resulting impact.

Cross-stakeholder:
The platform makes it easy to move from:
Problem → Solver → Project → Need/Offer → Collaboration → Pilot → Outcome.

Product perception:
A judge should NOT describe CivicBridge as:
“a complaint portal with dashboards.”

They should describe it as:

> “A platform that connects real civic problems with universities, startups, industry, and government and helps move those problems toward measurable field outcomes.”

---

# 28. Final Product Test

Before calling the product complete, ask:

1. If I am a citizen, why would I return after reporting a problem?
2. If I am government, what decision/action does CivicBridge help me make?
3. If I am a university, what valuable research opportunity do I get?
4. If I am a startup, what validated opportunity do I get?
5. If I am industry, what capability deployment opportunity do I get?
6. Can two organizations discover each other?
7. Can they request and accept a meaningful collaboration?
8. Can a collaboration become part of a project?
9. Can a project become a pilot?
10. Can the pilot produce measurable evidence?
11. Can multiple stakeholders verify the outcome?
12. Can the citizen see whether the original problem improved?
13. Does the platform still make sense if government does not verify a problem?
14. Does the Resource Exchange contain meaningful connected data?
15. Does every dashboard feel purpose-built for its stakeholder?
