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

// University Proposal Lifecycle (V2)
export type ProposalStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "WITHDRAWN";

// Collaboration Status (V3)
export type CollaborationStatus =
  | "INITIATED"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

// Project Track (V3)
export type ProjectTrack = "ACADEMIC_RESEARCH" | "COMMERCIAL_VENTURE" | "CIVIC_INITIATIVE";

// Project Status (V3)
export type ProjectStatus =
  | "PLANNING"
  | "BUILDING"
  | "PILOTING"
  | "COMPLETED"
  | "ABANDONED";

// Resource Exchange Categories (V3)
export type OfferCategory =
  | "LAB_EQUIPMENT"
  | "TESTING_ANALYSIS"
  | "MANUFACTURING_FABRICATION"
  | "FACILITY_SITE_ACCESS"
  | "DOMAIN_EXPERTISE_MENTORSHIP"
  | "HARDWARE_COMPONENTS";

export type NeedUrgency = "STANDARD" | "CRITICAL_PATH";

export type NeedStatus = "OPEN" | "MATCHED" | "IN_PROGRESS" | "FULFILLED" | "CANCELLED";

export type OfferStatus = "ACTIVE" | "ALLOCATED" | "EXHAUSTED" | "PAUSED";

// Pilot Execution Lifecycle (V3 Phase 4)
export type PilotStatus =
  | "PROPOSED"
  | "PREPARATION"
  | "ACTIVE_ON_GROUND"
  | "EVALUATION"
  | "CONCLUDED";

export type ClearanceStatus =
  | "NOT_REQUIRED"
  | "REQUIRED"
  | "REQUESTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_MORE_INFO"
  | "GRANTED"
  | "DECLINED";

export type VerificationFinding =
  | "SUCCESS_CONFIRMED"
  | "PARTIAL_IMPROVEMENT"
  | "NO_CHANGE"
  | "FAILED";

export type EvidenceType =
  | "PHOTO_GEOTAG"
  | "LAB_REPORT"
  | "SENSOR_DATASET"
  | "WRITTEN_INSPECTION";

export type MilestoneStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "VERIFIED"
  | "BLOCKED";

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
  district?: string | null;
  state?: string | null;
  contactEmail?: string | null;
  domainTags?: string[];
  expertiseTags?: string[];
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

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  district?: string;
  phone?: string;
  organizationName?: string;
}

// ─── V3 Entities ─────────────────────────────────────────────────────────────

export interface MilestoneItem {
  id: string;
  title: string;
  description?: string | null;
  targetDate?: string | null;
  completedAt?: string | null;
  status: MilestoneStatus;
  verifiedAt?: string | null;
  verifiedByOrg?: { id: string; name: string; type: string } | null;
}

export interface NeedItem {
  id: string;
  creatorOrgId: string;
  projectId?: string | null;
  milestoneId?: string | null;
  category: OfferCategory;
  title: string;
  details: string;
  district: string;
  urgency: NeedUrgency;
  status: NeedStatus;
  createdAt: string;
  updatedAt?: string;
  creatorOrg?: OrganizationInfo;
  project?: { id: string; title: string; trackType: ProjectTrack };
}

export interface OfferItem {
  id: string;
  providerOrgId: string;
  category: OfferCategory;
  title: string;
  specifications: string;
  district: string;
  capacityTerms?: string | null;
  status: OfferStatus;
  createdAt: string;
  updatedAt?: string;
  providerOrg?: OrganizationInfo;
}

export interface MatchResultItem {
  need?: NeedItem;
  offer?: OfferItem;
  score: number;
  breakdown: {
    categoryMatch: number;
    districtMatch: number;
    textSimilarity: number;
    urgencyWeight?: number;
    verifiedBonus?: number;
  };
}

export interface CollaborationRecord {
  id: string;
  providerOrgId: string;
  recipientOrgId: string;
  needId?: string | null;
  offerId?: string | null;
  projectId?: string | null;
  status: CollaborationStatus;
  terms?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt?: string;
  providerOrg?: OrganizationInfo;
  recipientOrg?: OrganizationInfo;
  need?: NeedItem | null;
  offer?: OfferItem | null;
  project?: { id: string; title: string; trackType: ProjectTrack } | null;
  milestones?: MilestoneItem[];
  progressUpdates?: Array<{
    id: string;
    updateText: string;
    createdAt: string;
    postedBy?: { id: string; name: string; role: Role } | null;
  }>;
}

export interface PilotMetricRecord {
  id: string;
  pilotId: string;
  metricName: string;
  unit: string;
  baselineValue: number;
  targetValue?: number | null;
  outcomeValue?: number | null;
  status: "REPORTED" | "VERIFIED";
  evidenceUrl?: string | null;
  recordedAt: string;
  recordedById: string;
  verifiedAt?: string | null;
  verifiedById?: string | null;
  recordedBy?: { id: string; name: string };
  verifiedBy?: { id: string; name: string };
}

export interface PilotVerificationRecord {
  id: string;
  pilotId: string;
  verifierId: string;
  verificationRole: Role;
  organizationId?: string | null;
  finding: VerificationFinding;
  evidenceType: EvidenceType;
  evidenceUrl?: string | null;
  feedbackText: string;
  verifiedAt: string;
  verifier?: { id: string; name: string; role: Role };
  organization?: OrganizationInfo | null;
}

export interface PilotDeploymentRecord {
  id: string;
  projectId: string;
  problemId?: string | null;
  responsibleOrgId?: string | null;
  title: string;
  description?: string | null;
  risksRequirements?: string | null;
  siteLocation: string;
  district: string;
  latitude?: number | null;
  longitude?: number | null;
  targetBeneficiaryCount: number;
  actualBeneficiaryCount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  clearanceStatus: ClearanceStatus;
  clearanceDocumentUrl?: string | null;
  clearanceNotes?: string | null;
  clearanceRequestedAt?: string | null;
  clearanceDecidedAt?: string | null;
  clearedById?: string | null;
  status: PilotStatus;
  evidenceDocumentUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; title: string; trackType: ProjectTrack };
  problem?: { id: string; title: string; district: string; priorityTier: PriorityTier };
  responsibleOrg?: OrganizationInfo | null;
  clearedBy?: { id: string; name: string; role: Role } | null;
  metrics?: PilotMetricRecord[];
  verifications?: PilotVerificationRecord[];
}

export interface ProjectRecord {
  id: string;
  title: string;
  executiveSummary: string;
  technicalApproach: string;
  trackType: ProjectTrack;
  status: ProjectStatus;
  leadOrgId: string;
  createdAt: string;
  updatedAt: string;
  leadOrg?: OrganizationInfo;
  problems?: Array<{
    id: string;
    problemId: string;
    isPrimary: boolean;
    problem: {
      id: string;
      title: string;
      description: string;
      category: string;
      district: string;
      priorityTier: PriorityTier;
      verificationStatus: VerificationStatus;
      status: ProblemStatus;
    };
  }>;
  milestones?: MilestoneItem[];
  needs?: NeedItem[];
  collaborations?: CollaborationRecord[];
  pilots?: PilotDeploymentRecord[];
  partners?: Array<{
    organizationId: string;
    role: string;
    organization: OrganizationInfo;
  }>;
  progressUpdates?: Array<{
    id: string;
    updateText: string;
    createdAt: string;
    postedBy?: { id: string; name: string; role: Role };
  }>;
}
