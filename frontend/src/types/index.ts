// 5 Authenticated Roles per GEMINI.md
export type Role = "CITIZEN" | "ADMIN" | "UNIVERSITY" | "INDUSTRY" | "STARTUP";

// Institutional Entity Type
export type OrganizationType = "UNIVERSITY" | "INDUSTRY" | "STARTUP";

// Exactly 3 Priority Tiers (0-100 Normalized Scale)
export type PriorityTier = "LOW" | "MEDIUM" | "HIGH";

// Independent Government Trust & Verification Signal
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

// Industry Collaboration Status
export type CollaborationStatus = "INTERESTED" | "ACTIVE" | "COMPLETED";

export interface HealthResponse {
  status: "ok" | "degraded";
  service: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  type: OrganizationType;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  district?: string | null;
  phone?: string | null;
  organizationId?: string | null;
  organization?: OrganizationInfo | null;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
  details?: Record<string, string[]>;
}
