import { Router, Request, Response } from "express";
import { Role, FilterStatus, ProposalStatus } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// Require authentication and strictly UNIVERSITY role for all university endpoints
router.use(authenticate);
router.use(authorizeRoles(Role.UNIVERSITY));

/**
 * Helper to compute explainable recommendation match score and reasons
 * between a university organization's profile and a civic problem.
 */
function evaluateProblemMatch(
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
    priorityScore: number;
    aiAnalysis?: {
      predictedCategory?: string | null;
      aiSummary?: string | null;
    } | null;
    proposals?: { universityId: string; status: ProposalStatus }[];
  }
) {
  const matchReasons: string[] = [];
  let matchScore = 0;

  const categoryText = `${problem.category} ${problem.subCategory || ""} ${problem.aiAnalysis?.predictedCategory || ""
    }`.toLowerCase();
  const contentText = `${problem.title} ${problem.description}`.toLowerCase();

  // 1. Institutional Domain Tags matching (e.g. "Environmental Engineering", "Civil Works", "IoT & Sensing")
  for (const tag of org.domainTags) {
    const cleanTag = tag.trim().toLowerCase();
    const tagWords = cleanTag.split(/\s+/).filter((w) => w.length > 3);

    // Exact or substring match in category / subcategory
    if (categoryText.includes(cleanTag) || tagWords.some((w) => categoryText.includes(w))) {
      matchScore += 35;
      matchReasons.push(`Matches institutional domain: ${tag}`);
      break;
    }
  }

  // 2. Department & Faculty Expertise Tags matching (e.g. "Water Quality Analysis", "Embedded Systems", "GIS Mapping")
  for (const tag of org.expertiseTags) {
    const cleanTag = tag.trim().toLowerCase();
    const tagWords = cleanTag.split(/\s+/).filter((w) => w.length > 3);

    if (
      contentText.includes(cleanTag) ||
      tagWords.some((w) => contentText.includes(w) || categoryText.includes(w))
    ) {
      matchScore += 30;
      matchReasons.push(`Matches your listed expertise: ${tag}`);
      break;
    }
  }

  // 3. Local District Alignment
  if (
    org.district &&
    problem.district &&
    org.district.trim().toLowerCase() === problem.district.trim().toLowerCase()
  ) {
    matchScore += 25;
    matchReasons.push(`Local district priority in ${org.district}`);
  }

  // 4. Civic Priority weight boost
  const priorityBoost = Math.round((problem.priorityScore || 0) * 0.15);
  matchScore += priorityBoost;

  // Fallback reason if score is low but problem is statewide priority
  if (matchReasons.length === 0) {
    matchReasons.push(`Statewide civic need in ${problem.category}`);
    matchScore += 10;
  }

  const hasExpressedInterest = (problem.proposals || []).some(
    (p) => p.universityId === org.id && p.status !== ProposalStatus.WITHDRAWN
  );

  return {
    matchScore: Math.min(100, matchScore),
    matchReasons,
    hasExpressedInterest,
  };
}

/**
 * GET /api/university/my-proposals
 * Returns research and prototype proposals belonging to the authenticated university organization.
 * Identity is derived strictly from JWT context (req.user.organizationId).
 */
router.get("/my-proposals", async (req: Request, res: Response) => {
  if (!req.user?.organizationId) {
    res.status(400).json({
      success: false,
      error: "Authenticated user must be associated with a registered university organization.",
    });
    return;
  }

  try {
    const proposals = await prisma.proposal.findMany({
      where: {
        universityId: req.user.organizationId,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            subCategory: true,
            district: true,
            locationText: true,
            affectedCount: true,
            priorityScore: true,
            priorityTier: true,
            verificationStatus: true,
            filterStatus: true,
            status: true,
            createdAt: true,
          },
        },
        progressUpdates: {
          orderBy: { createdAt: "desc" },
          include: {
            postedBy: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    const safeProposals = proposals.map((p) => ({
      ...p,
      title: p.deliverables?.split("\n")[0] || p.proposedApproach.slice(0, 60),
    }));

    res.status(200).json({
      success: true,
      count: safeProposals.length,
      proposals: safeProposals,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch university proposals.",
      details: error.message,
    });
  }
});

/**
 * GET /api/university/recommended-problems
 * Returns AI-screened problems from the statewide Problem Bank with explainable matching scores
 * and reasons tailored to the university's academic domain and expertise.
 * Non-verified problems remain fully discoverable and actionable.
 */
router.get("/recommended-problems", async (req: Request, res: Response) => {
  if (!req.user?.organizationId) {
    res.status(400).json({
      success: false,
      error: "Authenticated user must be associated with a registered university organization.",
    });
    return;
  }

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
    });

    if (!organization) {
      res.status(404).json({
        success: false,
        error: "University organization not found.",
      });
      return;
    }

    // Only problems that have passed AI relevance screening are in the Problem Bank
    // Zero-Gate guarantee: verificationStatus is an advisory trust signal, NOT a gate.
    const problems = await prisma.problem.findMany({
      where: {
        filterStatus: FilterStatus.PASSED,
      },
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
          },
        },
        proposals: {
          where: {
            universityId: organization.id,
          },
          select: {
            id: true,
            universityId: true,
            status: true,
          },
        },
      },
      orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
      take: 24,
    });

    const evaluated = problems.map((problem) => {
      const match = evaluateProblemMatch(organization, problem);
      return {
        id: problem.id,
        title: problem.title,
        description: problem.description,
        category: problem.category,
        subCategory: problem.subCategory,
        district: problem.district,
        locationText: problem.locationText,
        affectedCount: problem.affectedCount,
        priorityScore: problem.priorityScore,
        priorityTier: problem.priorityTier,
        verificationStatus: problem.verificationStatus,
        status: problem.status,
        createdAt: problem.createdAt,
        aiAnalysis: problem.aiAnalysis,
        matchScore: match.matchScore,
        matchReasons: match.matchReasons,
        hasExpressedInterest: match.hasExpressedInterest,
      };
    });

    // Sort by match score descending, then priority score descending
    evaluated.sort((a, b) => b.matchScore - a.matchScore || b.priorityScore - a.priorityScore);

    res.status(200).json({
      success: true,
      count: evaluated.length,
      recommendations: evaluated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to evaluate recommended problems.",
      details: error.message,
    });
  }
});

/**
 * GET /api/university/dashboard
 * Aggregated live dashboard endpoint for university portal.
 * Returns organization metadata, proposal statistics, active projects,
 * explainable problem recommendations, and recent project activity.
 */
router.get("/dashboard", async (req: Request, res: Response) => {
  if (!req.user?.organizationId) {
    res.status(400).json({
      success: false,
      error: "Authenticated user must be associated with a registered university organization.",
    });
    return;
  }

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
    });

    if (!organization) {
      res.status(404).json({
        success: false,
        error: "University organization not found.",
      });
      return;
    }

    // 1. Fetch all proposals submitted by this university
    const proposals = await prisma.proposal.findMany({
      where: {
        universityId: organization.id,
      },
      orderBy: { updatedAt: "desc" },
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
            filterStatus: true,
            status: true,
          },
        },
        progressUpdates: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            postedBy: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    const safeProposals = proposals.map((p) => ({
      ...p,
      title: p.deliverables?.split("\n")[0] || p.proposedApproach.slice(0, 60),
    }));

    // 2. Aggregate stats
    const totalProposals = safeProposals.length;
    const activeProposals = safeProposals.filter(
      (p) =>
        p.status === ProposalStatus.SUBMITTED ||
        p.status === ProposalStatus.UNDER_REVIEW ||
        p.status === ProposalStatus.ACCEPTED ||
        p.status === ProposalStatus.IN_PROGRESS
    ).length;
    const completedProposals = safeProposals.filter(
      (p) => p.status === ProposalStatus.COMPLETED
    ).length;

    // Distinct problems where university has expressed interest
    const expressedInterestProblemIds = Array.from(
      new Set(safeProposals.map((p) => p.problemId))
    );
    const expressedInterestCount = expressedInterestProblemIds.length;

    // 3. Fetch candidate Problem Bank problems for recommendations
    const candidateProblems = await prisma.problem.findMany({
      where: {
        filterStatus: FilterStatus.PASSED,
      },
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
          },
        },
        proposals: {
          where: {
            universityId: organization.id,
          },
          select: {
            id: true,
            universityId: true,
            status: true,
          },
        },
      },
      orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
      take: 20,
    });

    const recommendedProblems = candidateProblems
      .map((prob) => {
        const match = evaluateProblemMatch(organization, prob);
        return {
          id: prob.id,
          title: prob.title,
          description: prob.description,
          category: prob.category,
          subCategory: prob.subCategory,
          district: prob.district,
          locationText: prob.locationText,
          affectedCount: prob.affectedCount,
          priorityScore: prob.priorityScore,
          priorityTier: prob.priorityTier,
          verificationStatus: prob.verificationStatus,
          status: prob.status,
          createdAt: prob.createdAt,
          aiAnalysis: prob.aiAnalysis,
          matchScore: match.matchScore,
          matchReasons: match.matchReasons,
          hasExpressedInterest: match.hasExpressedInterest,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore || b.priorityScore - a.priorityScore)
      .slice(0, 6);

    // 4. Recent project activity across all proposals
    const recentActivity = safeProposals
      .flatMap((p) =>
        (p.progressUpdates || []).map((u) => ({
          ...u,
          proposalId: p.id,
          proposalTitle: p.title,
          problemTitle: p.problem?.title,
          problemId: p.problemId,
        }))
      )
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 6);

    res.status(200).json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        type: organization.type,
        regCode: organization.regCode,
        domainTags: organization.domainTags,
        expertiseTags: organization.expertiseTags,
        district: organization.district,
        state: organization.state,
      },
      stats: {
        totalProposals,
        activeProposals,
        completedProposals,
        expressedInterestCount,
      },
      myProposals: safeProposals,
      recommendedProblems,
      recentActivity,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to generate university dashboard data.",
      details: error.message,
    });
  }
});

/**
 * GET /api/university/my-needs
 * Returns resource/technical needs published by the authenticated university organization.
 * Reuses the existing Need model. No schema change.
 */
router.get("/my-needs", async (req: Request, res: Response) => {
  if (!req.user?.organizationId) {
    res.status(400).json({
      success: false,
      error: "Authenticated user must be associated with a registered university organization.",
    });
    return;
  }

  try {
    const needs = await prisma.need.findMany({
      where: { creatorOrgId: req.user.organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: { id: true, title: true, status: true },
        },
        milestone: {
          select: { id: true, title: true },
        },
      },
      take: 20,
    });

    res.status(200).json({
      success: true,
      count: needs.length,
      needs,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch university technical needs.",
      details: error.message,
    });
  }
});

export default router;

