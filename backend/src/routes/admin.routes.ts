import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  Role,
  FilterStatus,
  VerificationStatus,
  PriorityTier,
  ProblemStatus,
  VentureStage,
  ProposalStatus,
  CollaborationStatus,
} from "@prisma/client";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { calculatePriority } from "../services/ai/priority.calculator.js";

const router = Router();

// Protect all admin endpoints: user must be authenticated and possess Role.ADMIN
router.use(authenticate, authorizeRoles(Role.ADMIN));

export const adminVerifySchema = z.object({
  severityScore: z.coerce
    .number()
    .int("Severity score must be an integer")
    .min(0, "Severity score must be between 0 and 100")
    .max(100, "Severity score must be between 0 and 100")
    .optional(),
  affectedScore: z.coerce
    .number()
    .int("Affected score must be an integer")
    .min(0, "Affected score must be between 0 and 100")
    .max(100, "Affected score must be between 0 and 100")
    .optional(),
  frequencyScore: z.coerce
    .number()
    .int("Frequency score must be an integer")
    .min(0, "Frequency score must be between 0 and 100")
    .max(100, "Frequency score must be between 0 and 100")
    .optional(),
  evidenceScore: z.coerce
    .number()
    .int("Evidence score must be an integer")
    .min(0, "Evidence score must be between 0 and 100")
    .max(100, "Evidence score must be between 0 and 100")
    .optional(),
  urgencyScore: z.coerce
    .number()
    .int("Urgency score must be an integer")
    .min(0, "Urgency score must be between 0 and 100")
    .max(100, "Urgency score must be between 0 and 100")
    .optional(),
  decision: z
    .enum([
      "VERIFY",
      "GOVERNMENT_VERIFIED",
      "REJECT",
      "DECLINED_BY_GOVT",
      "REQUEST_INFO",
      "REQUEST_MORE_INFO",
    ])
    .optional()
    .default("VERIFY"),
  remarks: z.string().trim().max(2000, "Remarks cannot exceed 2000 characters").optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  reason: z.string().trim().max(500).optional().nullable(),
});

/**
 * GET /api/admin/verification-queue
 * Returns high-priority civic problems requesting parallel Government review.
 */
const handleGetVerificationQueue = async (req: Request, res: Response) => {
  try {
    const queue = await prisma.problem.findMany({
      where: {
        filterStatus: FilterStatus.PASSED,
        verificationStatus: VerificationStatus.AI_SCREENED,
        verificationRequested: true,
      },
      orderBy: [
        { priorityScore: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        aiAnalysis: {
          select: {
            id: true,
            aiSummary: true,
            predictedCategory: true,
            confidenceScore: true,
            severityScore: true,
            affectedPeopleScore: true,
            frequencyScore: true,
            evidenceScore: true,
            urgencyScore: true,
            aiUrgencyScore: true,
            aiUrgencyReason: true,
            isDuplicate: true,
            duplicateSimilarity: true,
          },
        },
        validation: {
          include: {
            reviewedBy: {
              select: {
                id: true,
                name: true,
                role: true,
                district: true,
              },
            },
          },
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            role: true,
            district: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      count: queue.length,
      queue,
      problems: queue,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch government verification queue.",
      details: error.message,
    });
  }
};

router.get("/verification-queue", handleGetVerificationQueue);
router.get("/problems/pending-verification", handleGetVerificationQueue);

/**
 * Common handler for verification actions (VERIFY, REJECT, REQUEST_MORE_INFO)
 */
async function handleVerificationAction(req: Request, res: Response) {
  const { id } = req.params;
  const parseResult = adminVerifySchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: "Validation error",
      details: parseResult.error.flatten().fieldErrors,
    });
  }

  const {
    severityScore,
    affectedScore,
    frequencyScore,
    evidenceScore,
    urgencyScore,
    decision,
    remarks,
    notes,
    reason,
  } = parseResult.data;

  try {
    const problem = await prisma.problem.findUnique({
      where: { id },
      include: {
        aiAnalysis: true,
        validation: true,
      },
    });

    if (!problem) {
      return res.status(404).json({
        success: false,
        error: `Problem with ID ${id} not found.`,
      });
    }

    if (problem.filterStatus !== FilterStatus.PASSED) {
      return res.status(400).json({
        success: false,
        error: `Problem cannot be verified because its filterStatus is ${problem.filterStatus}. Only PASSED problems are eligible for verification.`,
      });
    }

    // Resolve factor scores: use admin inputs if provided, otherwise fallback to AI analysis values
    const s = severityScore !== undefined ? severityScore : (problem.aiAnalysis?.severityScore ?? 50);
    const a = affectedScore !== undefined ? affectedScore : (problem.aiAnalysis?.affectedPeopleScore ?? 50);
    const f = frequencyScore !== undefined ? frequencyScore : (problem.aiAnalysis?.frequencyScore ?? 50);
    const e = evidenceScore !== undefined ? evidenceScore : (problem.aiAnalysis?.evidenceScore ?? 50);
    const u = urgencyScore !== undefined ? urgencyScore : (problem.aiAnalysis?.urgencyScore ?? 50);

    // Calculate normalized priority score and tier strictly via standard formula
    const { priorityScore, priorityTier } = calculatePriority({
      severityScore: s,
      affectedPeopleScore: a,
      frequencyScore: f,
      evidenceScore: e,
      urgencyScore: u,
    });

    // Map decision to VerificationStatus
    let targetVerificationStatus: VerificationStatus = VerificationStatus.AI_SCREENED;
    let validationDecision: VerificationStatus = VerificationStatus.AI_SCREENED;
    let defaultRemark = "";

    if (decision === "VERIFY" || decision === "GOVERNMENT_VERIFIED") {
      targetVerificationStatus = VerificationStatus.GOVERNMENT_VERIFIED;
      validationDecision = VerificationStatus.GOVERNMENT_VERIFIED;
      defaultRemark = "Endorsed and verified by District Administration.";
    } else if (decision === "REJECT" || decision === "DECLINED_BY_GOVT") {
      targetVerificationStatus = VerificationStatus.DECLINED_BY_GOVT;
      validationDecision = VerificationStatus.DECLINED_BY_GOVT;
      defaultRemark = "Declined for government verification upon administrative review.";
    } else {
      // REQUEST_INFO / REQUEST_MORE_INFO
      targetVerificationStatus = VerificationStatus.AI_SCREENED;
      validationDecision = VerificationStatus.AI_SCREENED;
      defaultRemark = "Additional evidence or ground confirmation requested by administration.";
    }

    const resolvedRemarks = remarks || notes || reason || defaultRemark;
    const finalVerificationNotes =
      decision === "REQUEST_INFO" || decision === "REQUEST_MORE_INFO"
        ? `[MORE_INFO_REQUESTED]: ${resolvedRemarks}`
        : resolvedRemarks;

    // 1. Create or update Validation record (audit trail)
    const validation = await prisma.validation.upsert({
      where: { problemId: problem.id },
      update: {
        reviewedById: req.user!.id,
        severityScore: s,
        affectedScore: a,
        frequencyScore: f,
        evidenceScore: e,
        urgencyScore: u,
        decision: validationDecision,
        remarks: resolvedRemarks,
        reviewedAt: new Date(),
      },
      create: {
        problemId: problem.id,
        reviewedById: req.user!.id,
        severityScore: s,
        affectedScore: a,
        frequencyScore: f,
        evidenceScore: e,
        urgencyScore: u,
        decision: validationDecision,
        remarks: resolvedRemarks,
        reviewedAt: new Date(),
      },
      include: {
        reviewedBy: {
          select: {
            id: true,
            name: true,
            role: true,
            district: true,
          },
        },
      },
    });

    // 2. Update the Problem record
    const updatedProblem = await prisma.problem.update({
      where: { id: problem.id },
      data: {
        verificationStatus: targetVerificationStatus,
        verifiedById: req.user!.id,
        verifiedAt: new Date(),
        verificationNotes: finalVerificationNotes,
        priorityScore,
        priorityTier,
        verificationRequested:
          decision === "REQUEST_INFO" || decision === "REQUEST_MORE_INFO" ? true : false,
      },
      include: {
        aiAnalysis: true,
        validation: {
          include: {
            reviewedBy: {
              select: {
                id: true,
                name: true,
                role: true,
                district: true,
              },
            },
          },
        },
        verifiedBy: {
          select: {
            id: true,
            name: true,
            role: true,
            district: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message:
        targetVerificationStatus === VerificationStatus.GOVERNMENT_VERIFIED
          ? "Civic problem officially verified and endorsed."
          : targetVerificationStatus === VerificationStatus.DECLINED_BY_GOVT
          ? "Civic problem verification declined. Problem remains active for institutional solving."
          : "Additional information requested. Problem remains in review.",
      problem: updatedProblem,
      validation,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Failed to process civic problem verification.",
      details: error.message,
    });
  }
}

/**
 * POST /api/admin/problems/:id/verify
 * Compatible with existing frontend and specs.
 */
router.post("/problems/:id/verify", handleVerificationAction);

/**
 * PUT /api/admin/problems/:id/verify
 * RESTful standard as per TRD specification.
 */
router.put("/problems/:id/verify", handleVerificationAction);

/**
 * POST /api/admin/problems/:id/decline
 * Backwards compatibility route for decline button.
 */
router.post("/problems/:id/decline", (req, res) => {
  req.body = { ...req.body, decision: "REJECT" };
  return handleVerificationAction(req, res);
});

// =============================================================================
// STATEWIDE CIVIC INTELLIGENCE & ANALYTICS
// =============================================================================
/**
 * GET /api/admin/analytics
 * High-performance statewide civic intelligence aggregation for Jharkhand administration.
 * Strictly calculates data from real relational tables with multi-factor filtering.
 */
router.get("/analytics", async (req: Request, res: Response) => {
  try {
    const {
      district,
      category,
      priorityTier,
      verificationStatus,
      fromDate,
      toDate,
    } = req.query as Record<string, string | undefined>;

    // Build dynamic where clause for filtering problems
    const where: any = {};

    if (district && district !== "ALL") {
      where.district = district;
    }
    if (category && category !== "ALL") {
      where.category = category;
    }
    if (priorityTier && Object.values(PriorityTier).includes(priorityTier as PriorityTier)) {
      where.priorityTier = priorityTier as PriorityTier;
    }
    if (verificationStatus && Object.values(VerificationStatus).includes(verificationStatus as VerificationStatus)) {
      where.verificationStatus = verificationStatus as VerificationStatus;
    }
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        const d = new Date(fromDate);
        if (!isNaN(d.getTime())) where.createdAt.gte = d;
      }
      if (toDate) {
        const d = new Date(toDate);
        if (!isNaN(d.getTime())) where.createdAt.lte = d;
      }
    }

    // 1. Problem Volume & Verification Stats
    const totalProblems = await prisma.problem.count({ where });
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentProblems = await prisma.problem.count({
      where: { ...where, createdAt: { gte: thirtyDaysAgo } },
    });

    const aiScreenedPassed = await prisma.problem.count({
      where: { ...where, filterStatus: FilterStatus.PASSED },
    });
    const aiRejected = await prisma.problem.count({
      where: { ...where, filterStatus: FilterStatus.REJECTED },
    });
    const aiPending = await prisma.problem.count({
      where: { ...where, filterStatus: FilterStatus.PENDING },
    });

    const governmentVerified = await prisma.problem.count({
      where: { ...where, verificationStatus: VerificationStatus.GOVERNMENT_VERIFIED },
    });
    const governmentDeclined = await prisma.problem.count({
      where: { ...where, verificationStatus: VerificationStatus.DECLINED_BY_GOVT },
    });
    const awaitingReview = await prisma.problem.count({
      where: {
        ...where,
        filterStatus: FilterStatus.PASSED,
        verificationRequested: true,
        verificationStatus: VerificationStatus.AI_SCREENED,
      },
    });

    // 2. Priority Distribution & Average
    // When priorityTier filter is applied, tiers not matching the filter must evaluate to 0
    const highPriorityCount = (!where.priorityTier || where.priorityTier === PriorityTier.HIGH)
      ? await prisma.problem.count({ where: { ...where, priorityTier: PriorityTier.HIGH } })
      : 0;
    const mediumPriorityCount = (!where.priorityTier || where.priorityTier === PriorityTier.MEDIUM)
      ? await prisma.problem.count({ where: { ...where, priorityTier: PriorityTier.MEDIUM } })
      : 0;
    const lowPriorityCount = (!where.priorityTier || where.priorityTier === PriorityTier.LOW)
      ? await prisma.problem.count({ where: { ...where, priorityTier: PriorityTier.LOW } })
      : 0;

    const priorityAvg = await prisma.problem.aggregate({
      where,
      _avg: { priorityScore: true },
    });
    const averagePriorityScore = Math.round((priorityAvg._avg.priorityScore || 0) * 10) / 10;

    // 3. Geographic Aggregations (by District)
    const districtGroups = await prisma.problem.groupBy({
      by: ["district"],
      where,
      _count: { id: true },
      _sum: { affectedCount: true },
      _avg: { priorityScore: true },
    });

    const highPriorityByDistrictGroups = await prisma.problem.groupBy({
      by: ["district"],
      where: { ...where, priorityTier: PriorityTier.HIGH },
      _count: { id: true },
    });
    const highByDistrictMap = new Map<string, number>();
    highPriorityByDistrictGroups.forEach((g) => highByDistrictMap.set(g.district, g._count.id));

    const problemsByDistrict = districtGroups
      .map((g) => ({
        district: g.district,
        count: g._count.id,
        affectedPopulation: g._sum.affectedCount || 0,
        avgPriority: Math.round((g._avg.priorityScore || 0) * 10) / 10,
        highPriorityCount: highByDistrictMap.get(g.district) || 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 4. Category Aggregations
    const categoryGroups = await prisma.problem.groupBy({
      by: ["category"],
      where,
      _count: { id: true },
      _avg: { priorityScore: true },
    });

    const highPriorityByCategoryGroups = await prisma.problem.groupBy({
      by: ["category"],
      where: { ...where, priorityTier: PriorityTier.HIGH },
      _count: { id: true },
    });
    const highByCategoryMap = new Map<string, number>();
    highPriorityByCategoryGroups.forEach((g) => highByCategoryMap.set(g.category, g._count.id));

    const problemsByCategory = categoryGroups
      .map((g) => ({
        category: g.category,
        count: g._count.id,
        avgPriority: Math.round((g._avg.priorityScore || 0) * 10) / 10,
        highPriorityCount: highByCategoryMap.get(g.category) || 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 5. Solution Ecosystem Counts
    const universityProposals = await prisma.proposal.count();
    const activeProposals = await prisma.proposal.count({
      where: { status: { in: [ProposalStatus.ACCEPTED, ProposalStatus.IN_PROGRESS] } },
    });
    const completedProposals = await prisma.proposal.count({
      where: { status: ProposalStatus.COMPLETED },
    });

    const startupConcepts = await prisma.businessConcept.count();
    const activeConcepts = await prisma.businessConcept.count({
      where: { currentStage: { in: [VentureStage.BUILDING, VentureStage.PILOTED] } },
    });
    const conceptsByStage = {
      claimed: await prisma.businessConcept.count({ where: { currentStage: VentureStage.PROBLEM_CLAIMED } }),
      submitted: await prisma.businessConcept.count({ where: { currentStage: VentureStage.CONCEPT_SUBMITTED } }),
      supportRequested: await prisma.businessConcept.count({ where: { currentStage: VentureStage.SUPPORT_REQUESTED } }),
      supportGranted: await prisma.businessConcept.count({ where: { currentStage: VentureStage.SUPPORT_GRANTED } }),
      building: await prisma.businessConcept.count({ where: { currentStage: VentureStage.BUILDING } }),
      piloted: await prisma.businessConcept.count({ where: { currentStage: VentureStage.PILOTED } }),
    };

    const industryCollaborations = await prisma.collaboration.count();
    const activeCollaborations = await prisma.collaboration.count({
      where: { status: CollaborationStatus.ACTIVE },
    });

    const totalProgressUpdates = await prisma.progressUpdate.count();
    const totalSupportRequests = await prisma.supportRequest.count();
    const pendingSupportRequests = await prisma.supportRequest.count({
      where: { status: "PENDING" },
    });

    // Problems with active solver engagement (proposals, concepts, collaborations)
    const problemsWithSolutions = await prisma.problem.count({
      where: {
        ...where,
        OR: [
          { proposals: { some: {} } },
          { businessConcepts: { some: {} } },
          { collaborations: { some: {} } },
        ],
      },
    });

    // 6. Innovation Pipeline Stages
    const pipeline = {
      reported: totalProblems,
      aiScreened: aiScreenedPassed,
      governmentReviewRequested: await prisma.problem.count({
        where: {
          ...where,
          OR: [
            { verificationRequested: true },
            { verificationStatus: VerificationStatus.GOVERNMENT_VERIFIED },
          ],
        },
      }),
      institutionalInterest: problemsWithSolutions,
      activeSolutions: await prisma.problem.count({
        where: {
          ...where,
          OR: [
            { proposals: { some: { status: { in: [ProposalStatus.ACCEPTED, ProposalStatus.IN_PROGRESS] } } } },
            { businessConcepts: { some: { currentStage: { in: [VentureStage.BUILDING, VentureStage.PILOTED] } } } },
            { collaborations: { some: { status: CollaborationStatus.ACTIVE } } },
          ],
        },
      }),
      pilotedOrResolved: await prisma.problem.count({
        where: {
          ...where,
          OR: [
            { status: ProblemStatus.RESOLVED },
            { proposals: { some: { status: ProposalStatus.COMPLETED } } },
            { businessConcepts: { some: { currentStage: VentureStage.PILOTED } } },
            { collaborations: { some: { status: CollaborationStatus.COMPLETED } } },
          ],
        },
      }),
    };

    // 7. Deterministic Attention Signals
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [
      highPriorityNoAction,
      awaitingGovtReviewList,
      highPopulationUnaddressed,
      staleProjects,
      pendingRequestsList,
    ] = await Promise.all([
      // Signal 1: High Priority Problems with Zero Institutional Solvers
      prisma.problem.findMany({
        where: {
          ...where,
          filterStatus: FilterStatus.PASSED,
          priorityTier: PriorityTier.HIGH,
          proposals: { none: {} },
          businessConcepts: { none: {} },
          collaborations: { none: {} },
        },
        select: {
          id: true,
          title: true,
          district: true,
          category: true,
          priorityScore: true,
          priorityTier: true,
          affectedCount: true,
          verificationStatus: true,
          createdAt: true,
        },
        orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
        take: 6,
      }),

      // Signal 2: Awaiting Government Verification Review
      prisma.problem.findMany({
        where: {
          ...where,
          filterStatus: FilterStatus.PASSED,
          verificationRequested: true,
          verificationStatus: VerificationStatus.AI_SCREENED,
        },
        select: {
          id: true,
          title: true,
          district: true,
          category: true,
          priorityScore: true,
          priorityTier: true,
          affectedCount: true,
          createdAt: true,
        },
        orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
        take: 6,
      }),

      // Signal 3: Large Population Unaddressed (>= 1,000 affected with zero solvers)
      prisma.problem.findMany({
        where: {
          ...where,
          filterStatus: FilterStatus.PASSED,
          affectedCount: { gte: 1000 },
          proposals: { none: {} },
          businessConcepts: { none: {} },
          collaborations: { none: {} },
        },
        select: {
          id: true,
          title: true,
          district: true,
          category: true,
          affectedCount: true,
          priorityScore: true,
          priorityTier: true,
          createdAt: true,
        },
        orderBy: [{ affectedCount: "desc" }, { priorityScore: "desc" }],
        take: 6,
      }),

      // Signal 4: Stale Institutional Activity (active proposals without updates in >14 days)
      prisma.problem.findMany({
        where: {
          ...where,
          proposals: {
            some: {
              status: { in: [ProposalStatus.ACCEPTED, ProposalStatus.IN_PROGRESS] },
              updatedAt: { lte: fourteenDaysAgo },
            },
          },
        },
        select: {
          id: true,
          title: true,
          district: true,
          category: true,
          priorityScore: true,
          priorityTier: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "asc" },
        take: 6,
      }),

      // Signal 5: Pending Support Requests
      prisma.supportRequest.findMany({
        where: { status: "PENDING" },
        include: {
          problem: {
            select: { id: true, title: true, district: true },
          },
          businessConcept: {
            select: {
              id: true,
              startup: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    // 8. Top Highest-Priority Civic Problems
    const topProblems = await prisma.problem.findMany({
      where: {
        ...where,
        filterStatus: FilterStatus.PASSED,
      },
      include: {
        _count: {
          select: {
            proposals: true,
            businessConcepts: true,
            collaborations: true,
          },
        },
      },
      orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
      take: 10,
    });

    res.json({
      success: true,
      filtersApplied: {
        district: district || "ALL",
        category: category || "ALL",
        priorityTier: priorityTier || "ALL",
        verificationStatus: verificationStatus || "ALL",
        fromDate: fromDate || null,
        toDate: toDate || null,
      },
      data: {
        volume: {
          totalProblems,
          recentProblems,
          aiScreenedPassed,
          aiRejected,
          aiPending,
          governmentVerified,
          governmentDeclined,
          awaitingReview,
        },
        priority: {
          high: highPriorityCount,
          medium: mediumPriorityCount,
          low: lowPriorityCount,
          averagePriorityScore,
          highPriorityByDistrict: Object.fromEntries(highByDistrictMap),
          highPriorityByCategory: Object.fromEntries(highByCategoryMap),
        },
        geography: {
          problemsByDistrict,
        },
        category: {
          problemsByCategory,
        },
        solutionEcosystem: {
          universityProposals,
          activeProposals,
          completedProposals,
          startupConcepts,
          activeConcepts,
          conceptsByStage,
          industryCollaborations,
          activeCollaborations,
          totalProgressUpdates,
          totalSupportRequests,
          pendingSupportRequests,
          problemsWithSolutions,
        },
        pipeline,
        signals: {
          highPriorityNoAction: {
            count: highPriorityNoAction.length,
            description: "High-priority problems with no university proposals, startup concepts, or industry collaborations.",
            items: highPriorityNoAction,
          },
          awaitingGovtVerification: {
            count: awaitingGovtReviewList.length,
            description: "AI-passed civic problems explicitly awaiting official government review and verification.",
            items: awaitingGovtReviewList,
          },
          highPopulationUnaddressed: {
            count: highPopulationUnaddressed.length,
            description: "Major community issues affecting 1,000+ citizens with zero solver activity.",
            items: highPopulationUnaddressed,
          },
          staleProjects: {
            count: staleProjects.length,
            description: "Institutional projects with no recorded progress updates in over 14 days.",
            items: staleProjects,
          },
          pendingSupportRequests: {
            count: pendingRequestsList.length,
            description: "Startup support requests awaiting institutional or administrative response.",
            items: pendingRequestsList.map((r) => ({
              id: r.id,
              requestType: r.requestType,
              requestedFrom: r.requestedFrom,
              details: r.details,
              createdAt: r.createdAt,
              problemId: r.problem.id,
              problemTitle: r.problem.title,
              startupName: r.businessConcept.startup.name,
            })),
          },
        },
        topProblems: topProblems.map((p) => ({
          id: p.id,
          title: p.title,
          district: p.district,
          category: p.category,
          subCategory: p.subCategory,
          priorityScore: p.priorityScore,
          priorityTier: p.priorityTier,
          affectedCount: p.affectedCount,
          verificationStatus: p.verificationStatus,
          proposalsCount: p._count.proposals,
          businessConceptsCount: p._count.businessConcepts,
          collaborationsCount: p._count.collaborations,
          status: p.status,
          createdAt: p.createdAt,
        })),
        explainability: {
          aiRole: "AI estimates category relevance and 5-factor priority components (Severity, Affected, Frequency, Evidence, Urgency).",
          priorityFormula: "Deterministic: (Severity×0.25) + (Affected×0.25) + (Frequency×0.15) + (Evidence×0.15) + (Urgency×0.20).",
          aggregationMethod: "Direct relational database grouping and tallying over verified and AI-passed problem records.",
          signalsMethod: "Deterministic governance rules; no unverified predictive ML models are claimed.",
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to generate statewide administrative analytics.",
      details: error.message,
    });
  }
});

export default router;

