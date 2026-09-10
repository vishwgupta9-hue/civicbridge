import { Router, Request, Response } from "express";
import { z } from "zod";
import { Role, FilterStatus, SupportType, CollaborationStatus, VentureStage } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// Require authentication and strictly INDUSTRY role for all industry endpoints
router.use(authenticate);
router.use(authorizeRoles(Role.INDUSTRY));

// Validation Schemas
const createIndustryCollabSchema = z.object({
  problemId: z.string().min(1, "Problem ID is required"),
  supportType: z.nativeEnum(SupportType, {
    errorMap: () => ({
      message: "supportType must be one of: MENTORSHIP, TECHNICAL, PROTOTYPING, GENERAL_INTEREST",
    }),
  }),
  description: z.string().trim().min(10, "Collaboration message must be at least 10 characters"),
});

const respondSupportRequestSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"], {
    errorMap: () => ({ message: "Status must be either APPROVED or REJECTED" }),
  }),
  responseNotes: z.string().trim().max(1000).optional(),
});

/**
 * Helper to compute explainable opportunity match score and reasons
 * between an industry enterprise's profile and a civic problem.
 */
function evaluateIndustryMatch(
  org: {
    id: string;
    name: string;
    district?: string | null;
    domainTags: string[];
    expertiseTags: string[];
  },
  problem: {
    id: string;
    title: string;
    description: string;
    category: string;
    subCategory?: string | null;
    district: string;
    affectedCount: number;
    priorityScore: number;
    priorityTier: string;
    aiAnalysis?: {
      predictedCategory?: string | null;
      aiSummary?: string | null;
    } | null;
    collaborations?: { industryId?: string | null }[];
  }
) {
  const matchReasons: string[] = [];
  let matchScore = 0;

  const categoryText = `${problem.category} ${problem.subCategory || ""} ${problem.aiAnalysis?.predictedCategory || ""
    }`.toLowerCase();
  const contentText = `${problem.title} ${problem.description}`.toLowerCase();

  // 1. Industry Domain matching (e.g. "Clean Tech", "Rural Infrastructure", "Industrial Waste")
  for (const tag of org.domainTags) {
    const cleanTag = tag.trim().toLowerCase();
    const tagWords = cleanTag.split(/\s+/).filter((w) => w.length > 3);

    if (categoryText.includes(cleanTag) || tagWords.some((w) => categoryText.includes(w))) {
      matchScore += 35;
      matchReasons.push(`Matches your domain: ${tag}`);
      break;
    }
  }

  // 2. Technical Capabilities & Facility matching (e.g. "Prototyping Labs", "Pilot Testing Facilities", "Mentorship")
  for (const tag of org.expertiseTags) {
    const cleanTag = tag.trim().toLowerCase();
    const tagWords = cleanTag.split(/\s+/).filter((w) => w.length > 3);

    if (
      contentText.includes(cleanTag) ||
      tagWords.some((w) => contentText.includes(w) || categoryText.includes(w))
    ) {
      matchScore += 30;
      matchReasons.push(`Matches your capability: ${tag}`);
      break;
    }
  }

  // 3. Local Industrial Belt & District Proximity
  if (
    org.district &&
    problem.district &&
    org.district.trim().toLowerCase() === problem.district.trim().toLowerCase()
  ) {
    matchScore += 25;
    matchReasons.push(`Relevant pilot opportunity in your district (${problem.district})`);
  }

  // 4. Large population scale suitable for CSR intervention
  if (problem.affectedCount >= 500) {
    matchScore += 15;
    matchReasons.push(`High community impact (${problem.affectedCount.toLocaleString()} affected citizens)`);
  }

  // 5. Civic Priority Alignment
  if (problem.priorityScore >= 70 || problem.priorityTier === "HIGH") {
    matchScore += 15;
    matchReasons.push(`High-priority civic problem (${problem.priorityScore}/100)`);
  } else if (problem.priorityScore >= 40) {
    matchScore += 8;
    matchReasons.push(`Medium priority civic issue (${problem.priorityScore}/100)`);
  }

  // 6. Base CSR Fallback
  if (matchReasons.length === 0) {
    matchScore = 15;
    matchReasons.push(`Statewide CSR & technology deployment candidate in ${problem.category}`);
  }

  // Cap at 100
  matchScore = Math.min(100, matchScore);

  return {
    matchScore,
    matchReasons,
  };
}

// =============================================================================
// 1. GET /api/industry/dashboard
// =============================================================================
/**
 * Real-time dashboard statistics and feeds for the authenticated industry user.
 */
router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(400).json({
        success: false,
        error: "Authenticated user is not linked to an industry organization.",
      });
      return;
    }

    // 1. Fetch organization profile
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      res.status(404).json({
        success: false,
        error: "Industry organization not found.",
      });
      return;
    }

    // 2. Fetch collaborations owned by this industry
    const myCollaborations = await prisma.collaboration.findMany({
      where: { industryId: orgId },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            category: true,
            subCategory: true,
            district: true,
            affectedCount: true,
            priorityScore: true,
            priorityTier: true,
            status: true,
            verificationStatus: true,
            filterStatus: true,
            createdAt: true,
            _count: {
              select: {
                proposals: true,
                businessConcepts: true,
                collaborations: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Fetch support requests directed to INDUSTRY
    const supportRequests = await prisma.supportRequest.findMany({
      where: { requestedFrom: Role.INDUSTRY },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            category: true,
            district: true,
            priorityScore: true,
            priorityTier: true,
          },
        },
        businessConcept: {
          select: {
            id: true,
            solutionDescription: true,
            targetBeneficiaries: true,
            currentStage: true,
            startup: {
              select: {
                id: true,
                name: true,
                district: true,
                contactEmail: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute metric tallies
    const totalCollaborations = myCollaborations.length;
    const activeCollaborations = myCollaborations.filter(
      (c) => c.status === CollaborationStatus.ACTIVE
    ).length;
    const interestedCollaborations = myCollaborations.filter(
      (c) => c.status === CollaborationStatus.INTERESTED
    ).length;
    const completedCollaborations = myCollaborations.filter(
      (c) => c.status === CollaborationStatus.COMPLETED
    ).length;

    const pendingSupportRequests = supportRequests.filter((r) => r.status === "PENDING").length;
    const approvedSupportRequests = supportRequests.filter((r) => r.status === "APPROVED").length;

    // 4. Fetch candidates for recommended opportunities
    const candidateProblems = await prisma.problem.findMany({
      where: {
        filterStatus: FilterStatus.PASSED,
      },
      include: {
        aiAnalysis: {
          select: {
            predictedCategory: true,
            aiSummary: true,
          },
        },
        collaborations: {
          select: {
            industryId: true,
          },
        },
        _count: {
          select: {
            proposals: true,
            businessConcepts: true,
            collaborations: true,
          },
        },
      },
      orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
      take: 20,
    });

    // Score recommendations
    const scoredOpportunities = candidateProblems
      .map((problem) => {
        const hasCollaborated = problem.collaborations.some((c) => c.industryId === orgId);
        const { matchScore, matchReasons } = evaluateIndustryMatch(org, problem);

        return {
          id: problem.id,
          title: problem.title,
          category: problem.category,
          subCategory: problem.subCategory,
          district: problem.district,
          affectedCount: problem.affectedCount,
          priorityScore: problem.priorityScore,
          priorityTier: problem.priorityTier,
          status: problem.status,
          verificationStatus: problem.verificationStatus,
          aiSummary: problem.aiAnalysis?.aiSummary || null,
          proposalsCount: problem._count.proposals,
          businessConceptsCount: problem._count.businessConcepts,
          collaborationsCount: problem._count.collaborations,
          hasCollaborated,
          matchScore,
          matchReasons,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6);

    // 5. Recent activity log (from collaborations and responses)
    const recentActivity = myCollaborations
      .filter((c) => c.problem)
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        type: "COLLABORATION_REGISTERED",
        title: `Collaboration Offered on "${c.problem!.title}"`,
        supportType: c.supportType,
        status: c.status,
        timestamp: c.createdAt,
        problemId: c.problem!.id,
      }));

    res.json({
      success: true,
      data: {
        organization: {
          id: org.id,
          name: org.name,
          type: org.type,
          regCode: org.regCode,
          domainTags: org.domainTags,
          expertiseTags: org.expertiseTags,
          district: org.district,
          state: org.state,
          contactEmail: org.contactEmail,
        },
        metrics: {
          totalCollaborations,
          activeCollaborations,
          interestedCollaborations,
          completedCollaborations,
          pendingSupportRequests,
          approvedSupportRequests,
          recommendedOpportunitiesCount: scoredOpportunities.length,
        },
        myCollaborations: myCollaborations
          .filter((c) => c.problem)
          .map((c) => ({
            id: c.id,
            supportType: c.supportType,
            message: c.message,
            status: c.status,
            createdAt: c.createdAt,
            problem: {
              id: c.problem!.id,
              title: c.problem!.title,
              category: c.problem!.category,
              district: c.problem!.district,
              priorityScore: c.problem!.priorityScore,
              priorityTier: c.problem!.priorityTier,
              status: c.problem!.status,
              verificationStatus: c.problem!.verificationStatus,
            },
          })),
        pendingRequests: supportRequests
          .filter((r) => r.status === "PENDING")
          .slice(0, 5)
          .map((r) => ({
            id: r.id,
            requestType: r.requestType,
            details: r.details,
            status: r.status,
            createdAt: r.createdAt,
            problem: r.problem,
            startup: r.businessConcept.startup,
          })),
        recommendedOpportunities: scoredOpportunities,
        recentActivity,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to load industry dashboard data.",
      details: error.message,
    });
  }
});

// =============================================================================
// 2. GET /api/industry/recommended-problems
// =============================================================================
/**
 * Explainable recommendation discovery for Industry partners.
 * Evaluates AI-screened problems against enterprise domain, expertise tags, and location.
 */
router.get("/recommended-problems", async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(400).json({
        success: false,
        error: "Authenticated user is not linked to an industry organization.",
      });
      return;
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      res.status(404).json({
        success: false,
        error: "Industry organization not found.",
      });
      return;
    }

    // Fetch AI-passed problems (Zero-Gate principle: verification is a trust signal, not a gate)
    const problems = await prisma.problem.findMany({
      where: {
        filterStatus: FilterStatus.PASSED,
      },
      include: {
        aiAnalysis: {
          select: {
            predictedCategory: true,
            aiSummary: true,
          },
        },
        collaborations: {
          select: {
            id: true,
            industryId: true,
            supportType: true,
            status: true,
          },
        },
        proposals: {
          select: {
            id: true,
            universityId: true,
            status: true,
          },
        },
        businessConcepts: {
          select: {
            id: true,
            startupId: true,
            currentStage: true,
          },
        },
        _count: {
          select: {
            proposals: true,
            businessConcepts: true,
            collaborations: true,
          },
        },
      },
      orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
    });

    const recommendations = problems.map((problem) => {
      const myCollaboration = problem.collaborations.find((c) => c.industryId === orgId);
      const { matchScore, matchReasons } = evaluateIndustryMatch(org, problem);

      return {
        id: problem.id,
        title: problem.title,
        description: problem.description,
        category: problem.category,
        subCategory: problem.subCategory,
        district: problem.district,
        affectedCount: problem.affectedCount,
        priorityScore: problem.priorityScore,
        priorityTier: problem.priorityTier,
        status: problem.status,
        verificationStatus: problem.verificationStatus,
        verificationRequested: problem.verificationRequested,
        aiSummary: problem.aiAnalysis?.aiSummary || null,
        proposalsCount: problem._count.proposals,
        businessConceptsCount: problem._count.businessConcepts,
        collaborationsCount: problem._count.collaborations,
        myCollaboration: myCollaboration
          ? {
            id: myCollaboration.id,
            supportType: myCollaboration.supportType,
            status: myCollaboration.status,
          }
          : null,
        hasCollaborated: !!myCollaboration,
        matchScore,
        matchReasons,
      };
    });

    // Sort by match score descending
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      success: true,
      count: recommendations.length,
      recommendations,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch industry recommendations.",
      details: error.message,
    });
  }
});

// =============================================================================
// 3. GET /api/industry/my-collaborations
// =============================================================================
/**
 * Returns all collaborations belonging strictly to the authenticated industry organization.
 */
router.get("/my-collaborations", async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(400).json({
        success: false,
        error: "Authenticated user is not linked to an industry organization.",
      });
      return;
    }

    const collaborations = await prisma.collaboration.findMany({
      where: { industryId: orgId },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            category: true,
            subCategory: true,
            district: true,
            affectedCount: true,
            priorityScore: true,
            priorityTier: true,
            status: true,
            verificationStatus: true,
            filterStatus: true,
            createdAt: true,
            aiAnalysis: {
              select: {
                aiSummary: true,
              },
            },
            _count: {
              select: {
                proposals: true,
                businessConcepts: true,
                collaborations: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      count: collaborations.filter((collab) => collab.problem).length,
      collaborations: collaborations
        .filter((collab) => collab.problem)
        .map((collab) => ({
          id: collab.id,
          supportType: collab.supportType,
          message: collab.message,
          status: collab.status,
          createdAt: collab.createdAt,
          problem: {
            id: collab.problem!.id,
            title: collab.problem!.title,
            category: collab.problem!.category,
            subCategory: collab.problem!.subCategory,
            district: collab.problem!.district,
            affectedCount: collab.problem!.affectedCount,
            priorityScore: collab.problem!.priorityScore,
            priorityTier: collab.problem!.priorityTier,
            status: collab.problem!.status,
            verificationStatus: collab.problem!.verificationStatus,
            aiSummary: collab.problem!.aiAnalysis?.aiSummary || null,
            proposalsCount: collab.problem!._count.proposals,
            businessConceptsCount: collab.problem!._count.businessConcepts,
            collaborationsCount: collab.problem!._count.collaborations,
          },
        })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch industry collaborations.",
      details: error.message,
    });
  }
});

// =============================================================================
// 4. POST /api/industry/collaborations
// =============================================================================
/**
 * Register a new industry collaboration on an eligible problem.
 * Prevents duplicate collaborations from the same industry organization on the same problem.
 */
router.post("/collaborations", async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(400).json({
        success: false,
        error: "Authenticated user must belong to an industry organization.",
      });
      return;
    }

    const parseResult = createIndustryCollabSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { problemId, supportType, description } = parseResult.data;

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
    });

    if (!problem) {
      res.status(404).json({
        success: false,
        error: `Problem with ID ${problemId} not found.`,
      });
      return;
    }

    if (problem.filterStatus !== FilterStatus.PASSED) {
      res.status(400).json({
        success: false,
        error: `Problem cannot accept collaborations because its filterStatus is ${problem.filterStatus}.`,
      });
      return;
    }

    // Prevent duplicate collaborations by the same industry organization
    const existingCollab = await prisma.collaboration.findFirst({
      where: {
        problemId,
        industryId: orgId,
      },
    });

    if (existingCollab) {
      res.status(400).json({
        success: false,
        error: "Your industry organization has already registered a collaboration for this problem.",
      });
      return;
    }

    const collaboration = await prisma.collaboration.create({
      data: {
        problemId,
        industryId: orgId,
        supportType,
        message: description,
        status: CollaborationStatus.INTERESTED,
      },
      include: {
        industry: {
          select: {
            id: true,
            name: true,
            type: true,
            district: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Industry collaboration offer registered successfully.",
      collaboration,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to register industry collaboration.",
      details: error.message,
    });
  }
});

// =============================================================================
// 5. GET /api/industry/support-requests
// =============================================================================
/**
 * View support requests sent to INDUSTRY by startups.
 */
router.get("/support-requests", async (req: Request, res: Response) => {
  try {
    const statusQuery = req.query.status as string | undefined;

    const whereClause: any = {
      requestedFrom: Role.INDUSTRY,
    };

    if (statusQuery) {
      whereClause.status = statusQuery.toUpperCase();
    }

    const requests = await prisma.supportRequest.findMany({
      where: whereClause,
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            category: true,
            subCategory: true,
            district: true,
            priorityScore: true,
            priorityTier: true,
            verificationStatus: true,
          },
        },
        businessConcept: {
          select: {
            id: true,
            solutionDescription: true,
            targetBeneficiaries: true,
            businessModel: true,
            currentStage: true,
            startup: {
              select: {
                id: true,
                name: true,
                district: true,
                contactEmail: true,
                domainTags: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch support requests.",
      details: error.message,
    });
  }
});

// =============================================================================
// 6. POST /api/industry/support-requests/:id/respond
// =============================================================================
/**
 * Accept (approve) or decline (reject) a support request from a startup.
 * Advances the startup's BusinessConcept to SUPPORT_GRANTED if approved.
 */
router.post("/support-requests/:id/respond", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(400).json({
        success: false,
        error: "Authenticated user must belong to an industry organization.",
      });
      return;
    }

    const parseResult = respondSupportRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { status, responseNotes } = parseResult.data;

    const supportRequest = await prisma.supportRequest.findUnique({
      where: { id },
      include: {
        businessConcept: true,
      },
    });

    if (!supportRequest) {
      res.status(404).json({
        success: false,
        error: `Support request with ID ${id} not found.`,
      });
      return;
    }

    if (supportRequest.requestedFrom !== Role.INDUSTRY) {
      res.status(400).json({
        success: false,
        error: "This support request was not directed to Industry.",
      });
      return;
    }

    // Update the support request status
    const updatedRequest = await prisma.supportRequest.update({
      where: { id },
      data: {
        status,
        responseNotes: responseNotes || (status === "APPROVED" ? "Accepted by Industry Partner" : "Declined by Industry Partner"),
      },
    });

    // If approved and startup's concept is currently in SUPPORT_REQUESTED, promote to SUPPORT_GRANTED
    if (status === "APPROVED" && supportRequest.businessConcept.currentStage === VentureStage.SUPPORT_REQUESTED) {
      await prisma.businessConcept.update({
        where: { id: supportRequest.businessConceptId },
        data: {
          currentStage: VentureStage.SUPPORT_GRANTED,
        },
      });
    }

    res.json({
      success: true,
      message: `Support request ${status.toLowerCase()} successfully.`,
      request: updatedRequest,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to respond to support request.",
      details: error.message,
    });
  }
});

export default router;
