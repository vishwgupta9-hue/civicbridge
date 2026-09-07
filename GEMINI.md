# SIH PS 26043 — AI Coding Instructions

## Project
We are building the SIH PS 26043 Community Problem-Solving Platform for Jharkhand.

## Source of Truth

Before making implementation decisions, read and understand:

- /docs/PRD.md
- /docs/TRD.md
- /docs/UI_UX.md
- /docs/DATABASE_SCHEMA.md
- /docs/USER_FLOW.md
- /docs/AI_SPEC.md
- /docs/TASKS.md

These documents are the primary source of truth.

Do not invent major features that are not specified.

If documents conflict, identify the conflict before implementing the affected feature.

If a technical decision is marked TBD, propose a practical MVP solution and clearly state the decision before implementation.

## Product Roles

The system has five authenticated roles:

1. Citizen
2. Government/Admin
3. University
4. Industry
5. Startup/Business Builder

Do not create unnecessary additional authentication roles.

## Mobile-First Requirement

The citizen experience must be designed mobile-first.

The website must work well on:

- Android smartphones
- small screens
- touch interfaces
- slow/average internet connections

Use:

- large touch targets
- readable typography
- simple navigation
- responsive forms
- responsive cards and tables
- mobile-friendly image/document upload

Desktop dashboards can use more information-dense layouts.

Do not build a desktop-only UI and make it responsive afterward.

## AI Rules

AI is advisory unless explicitly specified otherwise.

Never silently convert AI output into a government decision.

High-priority problems require government verification.

Duplicate detection must never automatically reject a problem.

Uncertain AI results should favor flagging/manual review.

AI-screened problems must remain clearly distinguishable from government-verified problems.

## Architecture

Keep these concerns separated:

- UI
- business logic
- database access
- authentication/authorization
- AI services
- file storage
- API/server logic

Avoid putting the whole application inside giant components or files.

## Development Rules

Work incrementally.

Before implementing a phase:

1. Explain what will be changed.
2. Identify files affected.
3. Identify dependencies.
4. Implement only that phase.
5. Run the application.
6. Run tests/lint/type checks where applicable.
7. Fix errors.
8. Summarize what was completed.

Do not silently skip errors.

Do not create fake functionality when a real implementation is required.

Do not move to the next major phase until the current phase is working.

## UX

Prioritize simplicity for citizens with minimal technical literacy.

Make status and verification states obvious.

Never make AI-screened content look government verified.

## Code Quality

Use TypeScript.

Prefer reusable components.

Keep naming clear and consistent.

Avoid unnecessary dependencies.

Do not over-engineer the MVP.

## Security

Never expose secrets or API keys in client-side code.

Use environment variables.

Enforce role-based access on the server, not only in the UI.

Validate user input on the server.

Restrict access to protected data.

## Testing

Test:

- authentication
- authorization
- citizen submission
- AI pipeline
- admin verification
- matching
- proposal submission
- business concept submission
- mobile responsiveness

## Important

This is a hackathon MVP.

Prioritize a stable end-to-end working product over unnecessary advanced features.