import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  Role,
  FilterStatus,
  SupportType,
  CollaborationStatus,
  VentureStage,
  CapabilityType,
} from "@prisma/client";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

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

const updateIndustryProfileSchema = z.object({
  companyType: z.string().trim().optional().nullable(),
  industryCategories: z.array(z.string()).optional(),
  domainTags: z.array(z.string()).optional(),
  expertiseTags: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  deploymentCapacity: z.string().trim().optional().nullable(),
  locationsServed: z.array(z.string()).optional(),
  caseStudies: z.string().trim().optional().nullable(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().trim().optional().nullable(),
  district: z.string().trim().optional().nullable(),
});

const createCapabilitySchema = z.object({
  type: z.nativeEnum(CapabilityType, {
    errorMap: () => ({ message: "Type must be PRODUCT, SERVICE, EQUIPMENT_FACILITY, or TECHNICAL_EXPERTISE" }),
  }),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().trim().min(10, "Description must be at least 10 characters"),
  category: z.string().trim().min(2, "Category is required"),
  specifications: z.any().optional(),
  availability: z.string().trim().optional().default("AVAILABLE"),
  locationsServed: z.array(z.string()).optional().default([]),
  caseStudies: z.string().trim().optional().nullable(),
});

const updateCapabilitySchema = z.object({
  type: z.nativeEnum(CapabilityType).optional(),
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(10).optional(),
  category: z.string().trim().min(2).optional(),
  specifications: z.any().optional(),
  availability: z.string().trim().optional(),
  locationsServed: z.array(z.string()).optional(),
  caseStudies: z.string().trim().optional().nullable(),
});

const createIndustryProposalSchema = z.object({
  problemId: z.string().min(1, "Problem ID is required"),
  capabilityId: z.string().optional().nullable(),
  providedItems: z.string().trim().min(5, "Provided items description is required"),
  technicalCapability: z.string().trim().min(5, "Technical capability is required"),
  relevantProductService: z.string().trim().optional().nullable(),
  previousDeployment: z.string().trim().optional().nullable(),
  deploymentRequirements: z.string().trim().optional().nullable(),
  expectedTimeline: z.string().trim().min(2, "Expected timeline is required"),
  estimatedCost: z.string().trim().optional().nullable(),
  expectedCivicImpact: z.string().trim().min(5, "Expected civic impact is required"),
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

  // 1. Industry Domain matching
  for (const tag of org.domainTags) {
    const cleanTag = tag.trim().toLowerCase();
    const tagWords = cleanTag.split(/\s+/).filter((w) => w.length > 3);

    if (categoryText.includes(cleanTag) || tagWords.some((w) => categoryText.includes(w))) {
      matchScore += 35;
      matchReasons.push(`Matches your domain: ${tag}`);
      break;
    }
  }

  // 2. Technical Capabilities & Facility matching
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

  matchScore = Math.min(100, matchScore);

  return {
    matchScore,
    matchReasons,
  };
}

// All industry endpoints require authentication
router.use(authenticate);

// =============================================================================
// CROSS-STAKEHOLDER MARKETPLACE DISCOVERY (Read-only for all authenticated roles)
// =============================================================================

/**
 * GET /api/industry/capabilities/marketplace
 * Public capability catalog across all industrial & solution partners.
 * Accessible to any authenticated role (Universities, Startups, Government, Industry).
 */
router.get("/capabilities/marketplace", async (req: Request, res: Response) => {
  try {
    const { type, category, district, search } = req.query;

    const whereClause: any = {};

    if (type && Object.values(CapabilityType).includes(type as CapabilityType)) {
      whereClause.type = type as CapabilityType;
    }

    if (category && typeof category === "string" && category !== "ALL") {
      whereClause.category = { contains: category, mode: "insensitive" };
    }

    if (district && typeof district === "string" && district !== "ALL") {
      whereClause.locationsServed = { has: district };
    }

    if (search && typeof search === "string") {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { organization: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const capabilities = await prisma.industryCapability.findMany({
      where: whereClause,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
            companyType: true,
            district: true,
            state: true,
            certifications: true,
            contactEmail: true,
            contactPhone: true,
            deploymentCapacity: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      count: capabilities.length,
      capabilities,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch industry capability marketplace.",
      details: error.message,
    });
  }
});

/**
 * GET /api/industry/capabilities/:id
 * Retrieve detail of a single capability.
 */
router.get("/capabilities/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const capability = await prisma.industryCapability.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
            companyType: true,
            industryCategories: true,
            district: true,
            state: true,
            certifications: true,
            contactEmail: true,
            contactPhone: true,
            deploymentCapacity: true,
            locationsServed: true,
            caseStudies: true,
          },
        },
      },
    });

    if (!capability) {
      res.status(404).json({
        success: false,
        error: `Capability with ID ${id} not found.`,
      });
      return;
    }

    res.json({
      success: true,
      capability,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch capability details.",
      details: error.message,
    });
  }
});

// =============================================================================
// STRICT INDUSTRY ROLE RESTRICTION FOR PARTNER MANAGEMENT ENDPOINTS
// =============================================================================
router.use(authorizeRoles(Role.INDUSTRY));

// =============================================================================
// 1. GET /api/industry/dashboard
// =============================================================================
/**
 * Real-time dashboard statistics, capability catalog, and active deployments
 * tailored for Industry & Solution Partners.
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

    // 2. Fetch all published capabilities of this partner
    const capabilities = await prisma.industryCapability.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    const productsCount = capabilities.filter((c) => c.type === CapabilityType.PRODUCT).length;
    const servicesCount = capabilities.filter((c) => c.type === CapabilityType.SERVICE).length;
    const equipmentCount = capabilities.filter((c) => c.type === CapabilityType.EQUIPMENT_FACILITY).length;
    const expertiseCount = capabilities.filter((c) => c.type === CapabilityType.TECHNICAL_EXPERTISE).length;

    // 3. Fetch capability & deployment proposals submitted by this partner
    const deploymentProposals = await prisma.industryDeploymentProposal.findMany({
      where: { organizationId: orgId },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            category: true,
            district: true,
            priorityScore: true,
            priorityTier: true,
            status: true,
            verificationStatus: true,
          },
        },
        capability: {
          select: {
            id: true,
            type: true,
            title: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 4. Fetch collaborations owned by this industry
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

    // 5. Fetch support requests directed to INDUSTRY
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

    // 6. Fetch active field pilot deployments involving this partner
    const activeDeployments = await prisma.pilotDeployment.findMany({
      where: {
        OR: [
          { responsibleOrgId: orgId },
          {
            project: {
              collaborations: {
                some: {
                  OR: [
                    { industryId: orgId },
                    { providerOrgId: orgId },
                  ],
                },
              },
            },
          },
        ],
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
        project: {
          select: {
            id: true,
            title: true,
            trackType: true,
            leadOrg: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        metrics: {
          take: 3,
          orderBy: { recordedAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // 7. Scored Civic Opportunities
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
        industryProposals: {
          where: { organizationId: orgId },
          select: { id: true, status: true },
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

    const scoredOpportunities = candidateProblems
      .map((problem) => {
        const hasCollaborated = problem.collaborations.some((c) => c.industryId === orgId);
        const hasProposed = problem.industryProposals.length > 0;
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
          hasProposed,
          matchScore,
          matchReasons,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6);

    // Compute metric tallies
    const totalCollaborations = myCollaborations.length;
    const activeCollaborations = myCollaborations.filter(
      (c) => c.status === CollaborationStatus.ACTIVE || c.status === CollaborationStatus.ACCEPTED
    ).length;
    const pendingSupportRequests = supportRequests.filter((r) => r.status === "PENDING").length;
    const approvedSupportRequests = supportRequests.filter((r) => r.status === "APPROVED").length;

    // Recent activity
    const recentActivity = [
      ...deploymentProposals.map((dp) => ({
        id: dp.id,
        type: "DEPLOYMENT_PROPOSAL",
        title: `Deployment Proposed: "${dp.providedItems.slice(0, 50)}..."`,
        status: dp.status,
        timestamp: dp.createdAt,
        problemId: dp.problem.id,
      })),
      ...myCollaborations.filter((c) => c.problem).map((c) => ({
        id: c.id,
        type: "COLLABORATION_REGISTERED",
        title: `Collaboration Offered on "${c.problem!.title}"`,
        supportType: c.supportType,
        status: c.status,
        timestamp: c.createdAt,
        problemId: c.problem!.id,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        organization: {
          id: org.id,
          name: org.name,
          type: org.type,
          companyType: org.companyType || "Enterprise Solution Partner",
          regCode: org.regCode,
          industryCategories: org.industryCategories || [],
          certifications: org.certifications || [],
          deploymentCapacity: org.deploymentCapacity || "",
          locationsServed: org.locationsServed || [],
          caseStudies: org.caseStudies || "",
          domainTags: org.domainTags,
          expertiseTags: org.expertiseTags,
          district: org.district,
          state: org.state,
          contactEmail: org.contactEmail,
          contactPhone: org.contactPhone,
        },
        metrics: {
          productsCount,
          servicesCount,
          equipmentCount,
          expertiseCount,
          totalCapabilities: capabilities.length,
          totalCollaborations,
          activeCollaborations,
          activeDeploymentsCount: activeDeployments.length,
          submittedProposalsCount: deploymentProposals.length,
          pendingSupportRequests,
          approvedSupportRequests,
          recommendedOpportunitiesCount: scoredOpportunities.length,
        },
        capabilities,
        deploymentProposals,
        activeDeployments,
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
// 2. PUT /api/industry/profile
// =============================================================================
/**
 * Update Industry profile details: company type, categories, certifications,
 * deployment capacity, locations served, and case studies.
 */
router.put("/profile", async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(400).json({
        success: false,
        error: "Authenticated user is not linked to an industry organization.",
      });
      return;
    }

    const parseResult = updateIndustryProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const data = parseResult.data;

    const updatedOrg = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(data.companyType !== undefined && { companyType: data.companyType }),
        ...(data.industryCategories !== undefined && { industryCategories: data.industryCategories }),
        ...(data.domainTags !== undefined && { domainTags: data.domainTags }),
        ...(data.expertiseTags !== undefined && { expertiseTags: data.expertiseTags }),
        ...(data.certifications !== undefined && { certifications: data.certifications }),
        ...(data.deploymentCapacity !== undefined && { deploymentCapacity: data.deploymentCapacity }),
        ...(data.locationsServed !== undefined && { locationsServed: data.locationsServed }),
        ...(data.caseStudies !== undefined && { caseStudies: data.caseStudies }),
        ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
        ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
        ...(data.district !== undefined && { district: data.district }),
      },
    });

    res.json({
      success: true,
      message: "Industry profile updated successfully.",
      organization: updatedOrg,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to update industry profile.",
      details: error.message,
    });
  }
});

// =============================================================================
// 3. CAPABILITY MANAGEMENT (CRUD for this organization)
// =============================================================================

/**
 * GET /api/industry/capabilities
 * List all capabilities belonging to the authenticated industry partner.
 */
router.get("/capabilities", async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(400).json({
        success: false,
        error: "Authenticated user is not linked to an industry organization.",
      });
      return;
    }

    const { type } = req.query;
    const whereClause: any = { organizationId: orgId };

    if (type && Object.values(CapabilityType).includes(type as CapabilityType)) {
      whereClause.type = type as CapabilityType;
    }

    const capabilities = await prisma.industryCapability.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { proposals: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      count: capabilities.length,
      capabilities,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch industry capabilities.",
      details: error.message,
    });
  }
});

/**
 * POST /api/industry/capabilities
 * Publish a new capability (Product, Service, Equipment/Facility, or Expertise).
 */
router.post("/capabilities", async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(400).json({
        success: false,
        error: "Authenticated user must belong to an industry organization.",
      });
      return;
    }

    const parseResult = createCapabilitySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { type, title, description, category, specifications, availability, locationsServed, caseStudies } =
      parseResult.data;

    const capability = await prisma.industryCapability.create({
      data: {
        organizationId: orgId,
        type,
        title,
        description,
        category,
        specifications: specifications || null,
        availability: availability || "AVAILABLE",
        locationsServed: locationsServed || [],
        caseStudies: caseStudies || null,
      },
    });

    res.status(201).json({
      success: true,
      message: `${type} published successfully to capability catalog.`,
      capability,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to publish capability.",
      details: error.message,
    });
  }
});

/**
 * PUT /api/industry/capabilities/:id
 * Update an existing capability owned by this industry partner.
 */
router.put("/capabilities/:id", async (req: Request, res: Response) => {
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

    const existing = await prisma.industryCapability.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: `Capability with ID ${id} not found.`,
      });
      return;
    }

    if (existing.organizationId !== orgId) {
      res.status(403).json({
        success: false,
        error: "You can only edit capabilities published by your organization.",
      });
      return;
    }

    const parseResult = updateCapabilitySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const data = parseResult.data;

    const updated = await prisma.industryCapability.update({
      where: { id },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.specifications !== undefined && { specifications: data.specifications }),
        ...(data.availability !== undefined && { availability: data.availability }),
        ...(data.locationsServed !== undefined && { locationsServed: data.locationsServed }),
        ...(data.caseStudies !== undefined && { caseStudies: data.caseStudies }),
      },
    });

    res.json({
      success: true,
      message: "Capability updated successfully.",
      capability: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to update capability.",
      details: error.message,
    });
  }
});

/**
 * DELETE /api/industry/capabilities/:id
 * Delete a capability owned by this industry partner.
 */
router.delete("/capabilities/:id", async (req: Request, res: Response) => {
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

    const existing = await prisma.industryCapability.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: `Capability with ID ${id} not found.`,
      });
      return;
    }

    if (existing.organizationId !== orgId) {
      res.status(403).json({
        success: false,
        error: "You can only delete capabilities published by your organization.",
      });
      return;
    }

    await prisma.industryCapability.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Capability removed from catalog successfully.",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to delete capability.",
      details: error.message,
    });
  }
});

// =============================================================================
// 4. CAPABILITY / DEPLOYMENT PROPOSALS & CIVIC CONTRIBUTION
// =============================================================================

/**
 * GET /api/industry/problems/:id/contribution-options
 * Pre-fill options and capabilities for proposing a contribution to a problem.
 */
router.get("/problems/:id/contribution-options", async (req: Request, res: Response) => {
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

    const problem = await prisma.problem.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        district: true,
        priorityScore: true,
        priorityTier: true,
        verificationStatus: true,
        affectedCount: true,
      },
    });

    if (!problem) {
      res.status(404).json({
        success: false,
        error: `Problem with ID ${id} not found.`,
      });
      return;
    }

    const myCapabilities = await prisma.industryCapability.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    const existingProposals = await prisma.industryDeploymentProposal.findMany({
      where: { problemId: id, organizationId: orgId },
      include: { capability: true },
    });

    const existingCollaboration = await prisma.collaboration.findFirst({
      where: { problemId: id, industryId: orgId },
    });

    res.json({
      success: true,
      problem,
      myCapabilities,
      existingProposals,
      existingCollaboration,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to load contribution options for problem.",
      details: error.message,
    });
  }
});

/**
 * POST /api/industry/proposals
 * Submit a focused Capability & Deployment Proposal for a civic problem.
 * Also synchronizes with a Collaboration record to preserve Golden Demo & project pipelines.
 */
router.post("/proposals", async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(400).json({
        success: false,
        error: "Authenticated user must belong to an industry organization.",
      });
      return;
    }

    const parseResult = createIndustryProposalSchema.safeParse(req.body);
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
      capabilityId,
      providedItems,
      technicalCapability,
      relevantProductService,
      previousDeployment,
      deploymentRequirements,
      expectedTimeline,
      estimatedCost,
      expectedCivicImpact,
    } = parseResult.data;

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
        error: `Cannot propose deployment for a problem with filterStatus ${problem.filterStatus}.`,
      });
      return;
    }

    // Verify capabilityId belongs to this org if specified
    if (capabilityId) {
      const cap = await prisma.industryCapability.findUnique({
        where: { id: capabilityId },
      });
      if (!cap || cap.organizationId !== orgId) {
        res.status(400).json({
          success: false,
          error: "Specified capability does not belong to your organization.",
        });
        return;
      }
    }

    // Create the Industry Deployment Proposal
    const proposal = await prisma.industryDeploymentProposal.create({
      data: {
        problemId,
        organizationId: orgId,
        capabilityId: capabilityId || null,
        providedItems,
        technicalCapability,
        relevantProductService: relevantProductService || null,
        previousDeployment: previousDeployment || null,
        deploymentRequirements: deploymentRequirements || null,
        expectedTimeline,
        estimatedCost: estimatedCost || null,
        expectedCivicImpact,
        status: "SUBMITTED",
      },
      include: {
        problem: {
          select: { id: true, title: true, district: true, category: true },
        },
        capability: true,
      },
    });

    // Seamlessly preserve legacy Collaboration pipeline
    const existingCollab = await prisma.collaboration.findFirst({
      where: { problemId, industryId: orgId },
    });

    if (!existingCollab) {
      await prisma.collaboration.create({
        data: {
          problemId,
          industryId: orgId,
          supportType: SupportType.TECHNICAL,
          message: `[Industry Deployment Proposal] ${providedItems} — ${technicalCapability}`,
          status: CollaborationStatus.INTERESTED,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: "Industry Capability & Deployment Proposal submitted successfully.",
      proposal,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to submit industry proposal.",
      details: error.message,
    });
  }
});

/**
 * GET /api/industry/proposals
 * List all capability / deployment proposals submitted by this partner.
 */
router.get("/proposals", async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(400).json({
        success: false,
        error: "Authenticated user must belong to an industry organization.",
      });
      return;
    }

    const { problemId } = req.query;
    const whereClause: any = { organizationId: orgId };
    if (problemId && typeof problemId === "string") {
      whereClause.problemId = problemId;
    }

    const proposals = await prisma.industryDeploymentProposal.findMany({
      where: whereClause,
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            category: true,
            district: true,
            priorityScore: true,
            priorityTier: true,
            status: true,
            verificationStatus: true,
          },
        },
        capability: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      count: proposals.length,
      proposals,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch industry proposals.",
      details: error.message,
    });
  }
});

// =============================================================================
// 5. EXISTING COLLABORATION & SUPPORT PIPELINES (Preserved for Golden Demo & Backwards Compatibility)
// =============================================================================

/**
 * GET /api/industry/recommended-problems
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

/**
 * GET /api/industry/my-collaborations
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

/**
 * POST /api/industry/collaborations
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

/**
 * GET /api/industry/support-requests
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

/**
 * POST /api/industry/support-requests/:id/respond
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

    const updatedRequest = await prisma.supportRequest.update({
      where: { id },
      data: {
        status,
        responseNotes: responseNotes || (status === "APPROVED" ? "Accepted by Industry Partner" : "Declined by Industry Partner"),
      },
    });

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
