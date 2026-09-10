// Strict 5 Authenticated Roles per GEMINI.md
export type Role = "CITIZEN" | "ADMIN" | "UNIVERSITY" | "INDUSTRY" | "STARTUP";

// Institutional Entity Type
export type OrganizationType = "UNIVERSITY" | "INDUSTRY" | "STARTUP" | "GOVERNMENT";

// Exactly 3 Priority Tiers per specification (No CRITICAL)
export type PriorityTier = "LOW" | "MEDIUM" | "HIGH";

// Independent Government Trust & Verification Signal (NOT a visibility gate)
export type VerificationStatus = "AI_SCREENED" | "GOVERNMENT_VERIFIED" | "DECLINED_BY_GOVT";

// Solution / Problem Progress Lifecycle (independent of child entity statuses)
export type ProblemStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

// University Proposal Lifecycle
export type ProposalStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "WITHDRAWN";

// Collaboration Status (V2 legacy + V3 structured commitment)
export type CollaborationStatus =
  | "INTERESTED"
  | "ACTIVE"
  | "COMPLETED"
  | "PROPOSED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "CONFIRMED"
  | "DECLINED"
  | "CANCELLED";

export type FilterStatus = "PENDING" | "PASSED" | "REJECTED" | "FLAGGED";

// NOTE: FUNDING is explicitly excluded per product decision
export type SupportType = "MENTORSHIP" | "TECHNICAL" | "PROTOTYPING" | "GENERAL_INTEREST";

export type VentureStage =
  | "PROBLEM_CLAIMED"
  | "CONCEPT_SUBMITTED"
  | "SUPPORT_REQUESTED"
  | "SUPPORT_GRANTED"
  | "BUILDING"
  | "PILOTED";

export interface HealthStatusResponse {
  status: "ok" | "degraded";
  service: string;
  timestamp: string;
  uptime: number;
  environment: string;
  database?: {
    status: "connected" | "disconnected";
    latencyMs: number | null;
  };
}
