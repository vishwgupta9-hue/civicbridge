# Database Schema Specification

## Smart India Hackathon — Problem Statement PS 26043
### CivicBridge: Crowdsourced Societal Problem-Solving Platform for Jharkhand

**Version:** 2.0 (Parallel Trust Architecture)  
**Database Engine:** PostgreSQL 15+ with `pgvector` extension  
**ORM:** Prisma ORM 5.x  

---

## 1. Architectural Principles

1. **Orthogonal Concept Separation:**
   - **Lifecycle Status (`ProblemStatus`):** Tracks the progress of problem-solving (`OPEN`, `PROPOSAL_SUBMITTED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).
   - **Verification Status (`VerificationStatus`):** Tracks independent Government trust (`AI_SCREENED`, `GOVERNMENT_VERIFIED`, `DECLINED_BY_GOVT`).
   - **Priority Tier (`PriorityTier`):** Tracks assessed societal urgency (`LOW`, `MEDIUM`, `HIGH`).
2. **Single Score Architecture:**
   - `priorityScore` is a floating-point value between `0.0` and `100.0`.
   - Calculated via: $(\text{Severity} \times 0.25) + (\text{Affected People} \times 0.25) + (\text{Frequency} \times 0.15) + (\text{Evidence} \times 0.15) + (\text{Urgency} \times 0.20)$.
   - There is **no separate numerical verification score** column.
3. **Zero Verification Gates:**
   - `Proposal`, `BusinessConcept`, and `Collaboration` foreign keys link directly to `Problem(id)` with no check constraint or requirement for `verificationStatus == 'GOVERNMENT_VERIFIED'`.
4. **No Anonymous Submissions:**
   - All problems require a valid `submittedById` referencing `User(id)` with role `CITIZEN`.

---

## 2. Entity Relationship Diagram

```
User (1) ──────────< (N) Problem [submittedBy]
User (1) ──────────< (1) Organization [for University, Industry, Startup]
User (1) ──────────< (N) Validation [reviewedBy Admin]
Organization (1) ──< (N) Proposal [universityId]
Organization (1) ──< (N) BusinessConcept [startupId]
Organization (1) ──< (N) Collaboration [industryId]

Problem (1) ───────< (1) AIAnalysis [1:1 cascade]
Problem (1) ───────< (1) Validation [1:1 cascade]
Problem (1) ───────< (N) Proposal [1:N]
Problem (1) ───────< (N) BusinessConcept [1:N]
Problem (1) ───────< (N) Collaboration [1:N]

Proposal (1) ──────< (N) ProgressUpdate
BusinessConcept (1)< (N) SupportRequest
BusinessConcept (1)< (N) ProgressUpdate
```

---

## 3. Complete Prisma Schema (`schema.prisma`)

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [pgvector(map: "vector")]
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

// -----------------------------------------------------------------------------
// ENUMS
// -----------------------------------------------------------------------------

enum Role {
  CITIZEN
  ADMIN
  UNIVERSITY
  INDUSTRY
  STARTUP
}

// Exactly 3 Priority Tiers (0-100 Normalized Scale)
enum PriorityTier {
  LOW       // 0.0 - 39.9
  MEDIUM    // 40.0 - 69.9
  HIGH      // 70.0 - 100.0
}

// Parallel Trust & Verification Signal (Government Endorsement)
enum VerificationStatus {
  AI_SCREENED          // Default upon passing AI relevance filter
  GOVERNMENT_VERIFIED  // Official confirmation by government official
  DECLINED_BY_GOVT     // Government inspected and declined verification (remains active)
}

// Solution / Problem Progress Lifecycle
enum ProblemStatus {
  OPEN                // Live in Problem Bank; available for solving/claiming
  PROPOSAL_SUBMITTED  // One or more university proposals attached
  IN_PROGRESS         // Active student project or startup venture underway
  RESOLVED            // Completed solution delivered and verified
  CLOSED              // Archived
}

enum FilterStatus {
  PASSED
  REJECTED
  FLAGGED
}

enum SupportType {
  MENTORSHIP
  TECHNICAL
  PROTOTYPING
  GENERAL_INTEREST  // NOTE: FUNDING is explicitly excluded per product decision
}

enum VentureStage {
  PROBLEM_CLAIMED
  CONCEPT_SUBMITTED
  SUPPORT_REQUESTED
  SUPPORT_GRANTED
  BUILDING
  PILOTED
}

// -----------------------------------------------------------------------------
// MODELS
// -----------------------------------------------------------------------------

model User {
  id              String         @id @default(uuid())
  name            String
  email           String         @unique
  passwordHash    String
  role            Role
  phone           String?
  district        String?
  organizationId  String?
  organization    Organization?  @relation(fields: [organizationId], references: [id])
  problems        Problem[]      @relation("CitizenProblems")
  validations     Validation[]   @relation("AdminValidations")
  progressUpdates ProgressUpdate[]
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([role])
  @@index([email])
}

model Organization {
  id               String          @id @default(uuid())
  name             String
  type             Role            // UNIVERSITY, INDUSTRY, or STARTUP
  regCode          String?         // AICTE/UGC Code for Uni, CIN for Industry, DPIIT for Startup
  domainTags       String[]        // ["Water & Sanitation", "Rural Tech", "Healthcare"]
  expertiseTags    String[]
  district         String?
  state            String          @default("Jharkhand")
  contactEmail     String
  contactPhone     String?
  users            User[]
  proposals        Proposal[]
  businessConcepts BusinessConcept[]
  collaborations   Collaboration[]
  createdAt        DateTime        @default(now())

  @@index([type])
}

model Problem {
  id                    String             @id @default(uuid())
  title                 String
  description           String             @db.Text
  category              String             // e.g. "Water & Sanitation", "Rural Roads", "Education"
  subCategory           String?
  district              String             // One of 24 Jharkhand districts
  locationText          String?
  latitude              Float?
  longitude             Float?
  affectedCount         Int                @default(1)
  evidenceUrl           String?            // Photo or PDF URL

  // Solution Lifecycle State
  status                ProblemStatus      @default(OPEN)

  // AI Relevance Screening State
  filterStatus          FilterStatus       @default(PASSED)
  filterReason          String?

  // Single Importance Metric (Unified Formula: 0.0 - 100.0)
  priorityScore         Float              @default(0.0)
  priorityTier          PriorityTier       @default(MEDIUM)

  // Parallel Government Trust Signal
  verificationStatus    VerificationStatus @default(AI_SCREENED)
  verificationNotes     String?            @db.Text
  verifiedAt            DateTime?
  verifiedById          String?
  verificationRequested Boolean            @default(false)

  // Submitter Relation (Authenticated Citizen)
  submittedById         String
  submittedBy           User               @relation("CitizenProblems", fields: [submittedById], references: [id])

  // Related Subsystems
  aiAnalysis            AIAnalysis?
  validation            Validation?
  proposals             Proposal[]
  businessConcepts      BusinessConcept[]
  collaborations        Collaboration[]
  supportRequests       SupportRequest[]

  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  @@index([status])
  @@index([verificationStatus])
  @@index([priorityTier])
  @@index([district])
  @@index([category])
}

model AIAnalysis {
  id                    String                   @id @default(uuid())
  problemId             String                   @unique
  problem               Problem                  @relation(fields: [problemId], references: [id], onDelete: Cascade)
  predictedCategory     String
  confidenceScore       Float                    // 0.0 - 1.0
  aiSummary             String                   @db.Text
  aiUrgencyScore        Int                      // 1 - 10
  aiUrgencyReason       String                   @db.Text
  isDuplicate           Boolean                  @default(false)
  duplicateSimilarity   Float?                   // Cosine similarity
  similarProblemIds     String[]                 // IDs of matched potential duplicates
  embedding             Unsupported("vector(1536)")?
  createdAt             DateTime                 @default(now())
}

model Validation {
  id                     String             @id @default(uuid())
  problemId              String             @unique
  problem                Problem            @relation(fields: [problemId], references: [id], onDelete: Cascade)
  reviewedById           String
  reviewedBy             User               @relation("AdminValidations", fields: [reviewedById], references: [id])
  
  // Normalized Factor Confirmations (0 - 100 each)
  severityScore          Int                // Weight: 25%
  affectedScore          Int                // Weight: 25%
  frequencyScore         Int                // Weight: 15%
  evidenceScore          Int                // Weight: 15%
  urgencyScore           Int                // Weight: 20%
  
  // Recalculated/Confirmed Single Priority Score (0.0 - 100.0)
  confirmedPriorityScore Float
  
  // Official Decision
  decision               VerificationStatus // GOVERNMENT_VERIFIED or DECLINED_BY_GOVT
  remarks                String?            @db.Text
  reviewedAt             DateTime           @default(now())
}

model Proposal {
  id                String          @id @default(uuid())
  problemId         String
  problem           Problem         @relation(fields: [problemId], references: [id], onDelete: Cascade)
  universityId      String
  university        Organization    @relation(fields: [universityId], references: [id])
  facultyMentor     String
  teamMembers       Json            // Array of { name, email, rollNo, role }
  proposedApproach  String          @db.Text
  deliverables      String          @db.Text
  timelineStart     DateTime
  timelineEnd       DateTime
  milestones        Json            // Array of { title, deadline, status }
  budgetRequired    Float?
  status            String          @default("SUBMITTED") // SUBMITTED, APPROVED, IN_PROGRESS, COMPLETED
  progressUpdates   ProgressUpdate[]
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@index([problemId])
  @@index([universityId])
}

model BusinessConcept {
  id                     String           @id @default(uuid())
  problemId              String
  problem                Problem          @relation(fields: [problemId], references: [id], onDelete: Cascade)
  startupId              String
  startup                Organization     @relation(fields: [startupId], references: [id])
  solutionDescription    String           @db.Text
  targetBeneficiaries    String           @db.Text
  marketSize             String?
  businessModel          String           @db.Text
  revenueModel           String           @db.Text
  sustainabilityModel    String           @db.Text
  currentStage           VentureStage     @default(PROBLEM_CLAIMED)
  supportRequests        SupportRequest[]
  progressUpdates        ProgressUpdate[]
  createdAt              DateTime         @default(now())
  updatedAt              DateTime         @updatedAt

  @@index([problemId])
  @@index([startupId])
}

model SupportRequest {
  id                 String           @id @default(uuid())
  businessConceptId  String
  businessConcept    BusinessConcept  @relation(fields: [businessConceptId], references: [id], onDelete: Cascade)
  problemId          String
  problem            Problem          @relation(fields: [problemId], references: [id])
  requestedFrom      Role             // ADMIN (Govt), UNIVERSITY, or INDUSTRY
  requestType        String           // "Endorsement", "Mentorship", "Lab Testing", "Scheme Referral"
  details            String           @db.Text
  status             String           @default("PENDING") // PENDING, APPROVED, REJECTED
  responseNotes      String?
  createdAt          DateTime         @default(now())
}

model Collaboration {
  id             String       @id @default(uuid())
  problemId      String
  problem        Problem      @relation(fields: [problemId], references: [id], onDelete: Cascade)
  industryId     String
  industry       Organization @relation(fields: [industryId], references: [id])
  supportType    SupportType
  message        String       @db.Text
  status         String       @default("INTERESTED") // INTERESTED, ACTIVE, COMPLETED
  createdAt      DateTime     @default(now())

  @@index([problemId])
  @@index([industryId])
}

model ProgressUpdate {
  id                 String           @id @default(uuid())
  proposalId         String?
  proposal           Proposal?        @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  businessConceptId  String?
  businessConcept    BusinessConcept? @relation(fields: [businessConceptId], references: [id], onDelete: Cascade)
  updateText         String           @db.Text
  milestoneTitle     String?
  attachmentUrl      String?
  postedById         String
  postedBy           User             @relation(fields: [postedById], references: [id])
  createdAt          DateTime         @default(now())
}
```
