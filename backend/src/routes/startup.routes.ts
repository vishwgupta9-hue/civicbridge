import { Router, Request, Response } from "express";
import { z } from "zod";
import { Role, FilterStatus, VentureStage } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// Require authentication and strictly STARTUP role for all startup endpoints
router.use(authenticate);
router.use(authorizeRoles(Role.STARTUP));

const claimOpportunitySchema = z.object({
  notes: z.string().trim().optional(),
  targetBeneficiaries: z.string().trim().optional(),
});

const proposeSolutionSchema = z.object({
  problemId: z.string().min(1, "Problem ID is required"),
  solutionName: z.string().trim().min(3, "Solution name must be at least 3 characters").max(250),
  solutionSummary: z.string().trim().min(10, "What does your solution do must be at least 10 characters"),
  productTechOffered: z.string().trim().min(5, "Product / technology offered must be at least 5 characters"),
  howItSolves: z.string().trim().min(10, "How it solves this problem must be at least 10 characters"),
  deploymentRequirements: z.string().trim().min(5, "Deployment requirements must be at least 5 characters"),
  expectedTimeline: z.string().trim().min(3, "Expected deployment timeline is required"),
  estimatedCost: z.string().trim().optional(),
  expectedCivicImpact: z.string().trim().min(5, "Expected civic impact must be at least 5 characters"),
});

const createSupportRequestSchema = z.object({
  problemId: z.string().min(1, "Problem ID is required"),
  businessConceptId: z.string().optional(),
  requestedFrom: z.nativeEnum(Role, {
    errorMap: () => ({ message: "Requested from must be one of: ADMIN, UNIVERSITY, INDUSTRY" }),
  }),
  requestType: z.string().trim().min(3, "Request type must be at least 3 characters").max(100),
  details: z.string().trim().min(10, "Details must be at least 10 characters"),
});

/**
 * Helper to compute explainable opportunity match score and reasons
 * between a startup organization's profile and a civic problem.
 */
function evaluateOpportunityMatch(
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
    businessConcepts?: { startupId: string; currentStage: VentureStage }[];
  }
) {
  const matchReasons: string[] = [];
  let matchScore = 0;

  const categoryText = `${problem.category} ${problem.subCategory || ""} ${problem.aiAnalysis?.predictedCategory || ""
    }`.toLowerCase();
  const contentText = `${problem.title} ${problem.description}`.toLowerCase();

  // 1. Startup Domain matching (e.g. "Clean Drinking Water", "Affordable Filtration", "IoT Monitoring")
  for (const tag of org.domainTags) {
    const cleanTag = tag.trim().toLowerCase();
    const tagWords = cleanTag.split(/\s+/).filter((w) => w.length > 3);

    if (categoryText.includes(cleanTag) || tagWords.some((w) => categoryText.includes(w))) {
      matchScore += 35;
      matchReasons.push(`Matches your domain: ${tag}`);
      break;
    }
  }

  // 2. Technology & Capabilities matching (e.g. "Adsorption Technology", "Low-Cost Sensors", "Community Distribution")
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

  // 3. Local District Market Alignment
  if (
    org.district &&
    problem.district &&
    org.district.trim().toLowerCase() === problem.district.trim().toLowerCase()
  ) {
    matchScore += 25;
    matchReasons.push(`Local opportunity in your target district (${org.district})`);
  }

  // 4. Large Addressable Population Scale
  if (problem.affectedCount >= 500) {
    matchScore += 15;
    matchReasons.push(
      `Large addressable user base (${problem.affectedCount.toLocaleString()} affected citizens)`
    );
  }

  // 5. Civic Priority Score
  if (problem.priorityScore >= 70) {
    matchScore += 15;
    matchReasons.push(
      `High civic priority (${problem.priorityTier}: ${Math.round(problem.priorityScore)}/100)`
    );
  }

  // Fallback reason if score is low
  if (matchReasons.length === 0) {
    matchReasons.push(`Statewide civic market opportunity in ${problem.category}`);
    matchScore += 10;
  }

  const existingConcept = (problem.businessConcepts || []).find(
    (c) => c.startupId === org.id
  );

  return {
    matchScore: Math.min(100, matchScore),
    matchReasons,
    isClaimed: !!existingConcept,
    currentStage: existingConcept?.currentStage || null,
  };
}

/**
 * GET /api/startup/dashboard
 * Aggregated live dashboard endpoint for startup portal.
 * Returns organization profile, venture stats, my claims, my concepts,
 * explainable recommended opportunities, and recent activity.
 */
router.get("/dashboard", async (req: Request, res: Response) => {
  if (!req.user?.organizationId) {
    res.status(400).json({
      success: false,
      error: "Authenticated user must be associated with a registered startup organization.",
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
        error: "Startup organization not found.",
      });
      return;
    }

    // 1. Fetch all business concepts belonging to this startup
    const concepts = await prisma.businessConcept.findMany({
      where: {
        startupId: organization.id,
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
            affectedCount: true,
            priorityScore: true,
            priorityTier: true,
            verificationStatus: true,
            filterStatus: true,
            status: true,
          },
        },
        supportRequests: {
          orderBy: { createdAt: "desc" },
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

    const safeConcepts = concepts.map((c) => ({
      ...c,
      title: c.marketSize || c.solutionDescription.slice(0, 60),
    }));

    // 2. Aggregate stats
    const totalConcepts = safeConcepts.length;
    const totalClaims = safeConcepts.filter(
      (c) => c.currentStage === VentureStage.PROBLEM_CLAIMED
    ).length;
    const activePilots = safeConcepts.filter(
      (c) =>
        c.currentStage === VentureStage.BUILDING ||
        c.currentStage === VentureStage.PILOTED ||
        c.currentStage === VentureStage.SUPPORT_GRANTED
    ).length;

    // Support requests count
    const supportRequests = await prisma.supportRequest.findMany({
      where: {
        businessConcept: {
          startupId: organization.id,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            district: true,
            category: true,
          },
        },
      },
    });

    // 3. Recommended Opportunities from Problem Bank (filterStatus = PASSED)
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
        businessConcepts: {
          where: {
            startupId: organization.id,
          },
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
      take: 20,
    });

    const recommendedOpportunities = candidateProblems
      .map((prob) => {
        const match = evaluateOpportunityMatch(organization, prob);
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
          isClaimed: match.isClaimed,
          currentStage: match.currentStage,
          solverActivity: {
            proposalsCount: prob._count.proposals,
            conceptsCount: prob._count.businessConcepts,
            collaborationsCount: prob._count.collaborations,
          },
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore || b.priorityScore - a.priorityScore)
      .slice(0, 6);

    // 4. Recent project activity feed
    const recentActivity = safeConcepts
      .flatMap((c) =>
        (c.progressUpdates || []).map((u) => ({
          ...u,
          conceptId: c.id,
          conceptTitle: c.title,
          problemTitle: c.problem?.title,
          problemId: c.problemId,
        }))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
        totalClaims,
        totalConcepts,
        activePilots,
        supportRequestsCount: supportRequests.length,
      },
      myClaims: safeConcepts.filter((c) => c.currentStage === VentureStage.PROBLEM_CLAIMED),
      myConcepts: safeConcepts,
      recommendedOpportunities,
      supportRequests,
      recentActivity,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to load startup dashboard.",
      details: error.message,
    });
  }
});

/**
 * GET /api/startup/recommended-opportunities
 * Returns AI-screened problems with explainable recommendation matching for startups.
 * Non-verified problems remain fully discoverable and actionable (Zero-Gate).
 */
router.get("/recommended-opportunities", async (req: Request, res: Response) => {
  if (!req.user?.organizationId) {
    res.status(400).json({
      success: false,
      error: "Authenticated user must be associated with a registered startup organization.",
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
        error: "Startup organization not found.",
      });
      return;
    }

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
        businessConcepts: {
          where: {
            startupId: organization.id,
          },
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
      take: 24,
    });

    const evaluated = problems.map((problem) => {
      const match = evaluateOpportunityMatch(organization, problem);
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
        isClaimed: match.isClaimed,
        currentStage: match.currentStage,
        solverActivity: {
          proposalsCount: problem._count.proposals,
          conceptsCount: problem._count.businessConcepts,
          collaborationsCount: problem._count.collaborations,
        },
      };
    });

    evaluated.sort((a, b) => b.matchScore - a.matchScore || b.priorityScore - a.priorityScore);

    res.status(200).json({
      success: true,
      count: evaluated.length,
      recommendations: evaluated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch recommended opportunities.",
      details: error.message,
    });
  }
});

/**
 * GET /api/startup/my-claims
 * Returns opportunities claimed by this startup.
 */
router.get("/my-claims", async (req: Request, res: Response) => {
  if (!req.user?.organizationId) {
    res.status(400).json({
      success: false,
      error: "Authenticated user must be associated with a registered startup organization.",
    });
    return;
  }

  try {
    const claims = await prisma.businessConcept.findMany({
      where: {
        startupId: req.user.organizationId,
        currentStage: VentureStage.PROBLEM_CLAIMED,
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
            status: true,
            createdAt: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      count: claims.length,
      claims,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch startup claims.",
      details: error.message,
    });
  }
});

/**
 * GET /api/startup/my-concepts
 * Returns full business concepts belonging to the authenticated startup organization.
 */
router.get("/my-concepts", async (req: Request, res: Response) => {
  if (!req.user?.organizationId) {
    res.status(400).json({
      success: false,
      error: "Authenticated user must be associated with a registered startup organization.",
    });
    return;
  }

  try {
    const concepts = await prisma.businessConcept.findMany({
      where: {
        startupId: req.user.organizationId,
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
            status: true,
            createdAt: true,
          },
        },
        supportRequests: true,
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

    const safeConcepts = concepts.map((c) => ({
      ...c,
      title: c.marketSize || c.solutionDescription.slice(0, 60),
    }));

    res.status(200).json({
      success: true,
      count: safeConcepts.length,
      concepts: safeConcepts,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch startup business concepts.",
      details: error.message,
    });
  }
});

/**
 * POST /api/startup/claim/:problemId
 * Allows an authenticated startup to claim / express interest in an opportunity.
 * Sets initial VentureStage to PROBLEM_CLAIMED.
 * Strictly prevents duplicates, non-passed problems, and non-existent IDs.
 */
router.post("/claim/:problemId", async (req: Request, res: Response) => {
  const { problemId } = req.params;

  if (!req.user?.organizationId) {
    res.status(400).json({
      success: false,
      error: "Authenticated user must be associated with a registered startup organization.",
    });
    return;
  }

  const parseResult = claimOpportunitySchema.safeParse(req.body);
  const data = parseResult.success ? parseResult.data : {};

  try {
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
        error: `Problem cannot be claimed because its filterStatus is ${problem.filterStatus}. Only PASSED problems in the Problem Bank are claimable.`,
      });
      return;
    }

    // Check for existing claim/concept from same startup on this problem
    const existing = await prisma.businessConcept.findFirst({
      where: {
        problemId,
        startupId: req.user.organizationId,
      },
    });

    if (existing) {
      res.status(400).json({
        success: false,
        error: "Your startup has already claimed or submitted a concept for this opportunity.",
      });
      return;
    }

    const claim = await prisma.businessConcept.create({
      data: {
        problemId,
        startupId: req.user.organizationId,
        solutionDescription:
          data.notes || "Startup expressed interest in exploring a commercial/social civic solution.",
        targetBeneficiaries:
          data.targetBeneficiaries || `Citizens and local community members in ${problem.district}`,
        marketSize: "Initial Opportunity Claim",
        businessModel: "To be formulated during solution design phase",
        revenueModel: "To be determined",
        sustainabilityModel: "Local community and municipal alignment",
        currentStage: VentureStage.PROBLEM_CLAIMED,
      },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            category: true,
            district: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Opportunity claimed successfully.",
      claim,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to claim opportunity.",
      details: error.message,
    });
  }
});

/**
 * POST /api/startup/propose-solution
 * Allows an authenticated startup to submit a concrete solution for a civic opportunity.
 * Creates or upgrades a BusinessConcept to CONCEPT_SUBMITTED stage with detailed solution structure.
 */
router.post("/propose-solution", async (req: Request, res: Response) => {
  if (!req.user?.organizationId) {
    res.status(400).json({
      success: false,
      error: "Authenticated user must be associated with a registered startup organization.",
    });
    return;
  }

  const parseResult = proposeSolutionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: "Validation error",
      details: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  const {
    problemId,
    solutionName,
    solutionSummary,
    productTechOffered,
    howItSolves,
    deploymentRequirements,
    expectedTimeline,
    estimatedCost,
    expectedCivicImpact,
  } = parseResult.data;

  try {
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
        error: `Problem cannot accept solution proposals because its filterStatus is ${problem.filterStatus}. Only PASSED problems in the Problem Bank can receive proposals.`,
      });
      return;
    }

    // Check if startup already has a concept for this problem
    const existing = await prisma.businessConcept.findFirst({
      where: {
        problemId,
        startupId: req.user.organizationId,
      },
    });

    // Format rich solution details into the existing BusinessConcept fields
    const formattedSolutionDescription = `${solutionSummary}\n\nTechnology / Product: ${productTechOffered}\nHow It Solves Problem: ${howItSolves}`;
    const formattedBusinessModel = `Solution: ${solutionName}\nDeployment: ${deploymentRequirements}\nTimeline: ${expectedTimeline}${estimatedCost ? `\nEstimated Cost: ${estimatedCost}` : ""}`;
    const formattedSustainabilityModel = `Impact: ${expectedCivicImpact}\nDeployment: ${deploymentRequirements}`;

    let concept;
    if (existing) {
      // Update existing claim/concept with full proposal
      concept = await prisma.businessConcept.update({
        where: { id: existing.id },
        data: {
          solutionDescription: formattedSolutionDescription,
          targetBeneficiaries: `Citizens and community stakeholders in ${problem.district}`,
          marketSize: solutionName,
          businessModel: formattedBusinessModel,
          revenueModel: estimatedCost ? `Estimated Cost: ${estimatedCost}` : "Commercial / Sustainable Civic Deployment",
          sustainabilityModel: formattedSustainabilityModel,
          currentStage: VentureStage.CONCEPT_SUBMITTED,
        },
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              category: true,
              district: true,
            },
          },
        },
      });
    } else {
      // Create new business concept with full proposal
      concept = await prisma.businessConcept.create({
        data: {
          problemId,
          startupId: req.user.organizationId,
          solutionDescription: formattedSolutionDescription,
          targetBeneficiaries: `Citizens and community stakeholders in ${problem.district}`,
          marketSize: solutionName,
          businessModel: formattedBusinessModel,
          revenueModel: estimatedCost ? `Estimated Cost: ${estimatedCost}` : "Commercial / Sustainable Civic Deployment",
          sustainabilityModel: formattedSustainabilityModel,
          currentStage: VentureStage.CONCEPT_SUBMITTED,
        },
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              category: true,
              district: true,
            },
          },
        },
      });
    }

    res.status(201).json({
      success: true,
      message: "Solution proposal submitted successfully.",
      concept,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to submit solution proposal.",
      details: error.message,
    });
  }
});

/**
 * POST /api/startup/support-requests
 * Allows an authenticated startup to file a SupportRequest for its business concept.
 * Targeted at ADMIN (Government), UNIVERSITY, or INDUSTRY.
 * Progresses concept stage to SUPPORT_REQUESTED.
 */
router.post("/support-requests", async (req: Request, res: Response) => {
  if (!req.user?.organizationId) {
    res.status(400).json({
      success: false,
      error: "Authenticated user must be associated with a registered startup organization.",
    });
    return;
  }

  const parseResult = createSupportRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: "Validation error",
      details: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  const { problemId, businessConceptId, requestedFrom, requestType, details } = parseResult.data;

  // Prohibit requestedFrom being CITIZEN or STARTUP
  if (
    requestedFrom !== Role.ADMIN &&
    requestedFrom !== Role.UNIVERSITY &&
    requestedFrom !== Role.INDUSTRY
  ) {
    res.status(400).json({
      success: false,
      error: "Support requests must be directed to Government (ADMIN), UNIVERSITY, or INDUSTRY.",
    });
    return;
  }

  try {
    // Find the startup's concept for this problem
    let concept;
    if (businessConceptId) {
      concept = await prisma.businessConcept.findUnique({
        where: { id: businessConceptId },
      });
    } else {
      concept = await prisma.businessConcept.findFirst({
        where: {
          problemId,
          startupId: req.user.organizationId,
        },
      });
    }

    if (!concept) {
      res.status(404).json({
        success: false,
        error: "Active business concept or claimed opportunity for this problem not found for your startup.",
      });
      return;
    }

    // Verify ownership
    if (concept.startupId !== req.user.organizationId) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only file support requests for your own startup's concepts.",
      });
      return;
    }

    const supportRequest = await prisma.supportRequest.create({
      data: {
        businessConceptId: concept.id,
        problemId: concept.problemId,
        requestedFrom,
        requestType,
        details,
        status: "PENDING",
      },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            district: true,
          },
        },
        businessConcept: {
          select: {
            id: true,
            solutionDescription: true,
            currentStage: true,
          },
        },
      },
    });

    // Update concept stage to SUPPORT_REQUESTED if currently at PROBLEM_CLAIMED or CONCEPT_SUBMITTED
    if (
      concept.currentStage === VentureStage.PROBLEM_CLAIMED ||
      concept.currentStage === VentureStage.CONCEPT_SUBMITTED
    ) {
      await prisma.businessConcept.update({
        where: { id: concept.id },
        data: { currentStage: VentureStage.SUPPORT_REQUESTED },
      });
    }

    res.status(201).json({
      success: true,
      message: "Support request submitted successfully.",
      supportRequest,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to submit support request.",
      details: error.message,
    });
  }
});

/**
 * GET /api/startup/my-support-requests
 * Returns all support requests filed by this startup across its ventures.
 */
router.get("/my-support-requests", async (req: Request, res: Response) => {
  if (!req.user?.organizationId) {
    res.status(400).json({
      success: false,
      error: "Authenticated user must be associated with a registered startup organization.",
    });
    return;
  }

  try {
    const supportRequests = await prisma.supportRequest.findMany({
      where: {
        businessConcept: {
          startupId: req.user.organizationId,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            district: true,
            category: true,
          },
        },
        businessConcept: {
          select: {
            id: true,
            currentStage: true,
            solutionDescription: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      count: supportRequests.length,
      supportRequests,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch support requests.",
      details: error.message,
    });
  }
});

export default router;
