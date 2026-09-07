import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  Role,
  FilterStatus,
  SupportType,
  ProposalStatus,
  VentureStage,
  CollaborationStatus,
} from "@prisma/client";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createProposalSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(250),
  description: z.string().trim().min(10, "Description must be at least 10 characters"),
  facultyMentor: z.string().trim().optional(),
  deliverables: z.string().trim().optional(),
  timelineStart: z.string().optional(),
  timelineEnd: z.string().optional(),
  milestones: z.array(z.any()).optional(),
  budgetRequired: z.coerce.number().optional(),
});

const createBusinessConceptSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(250),
  description: z.string().trim().min(10, "Description must be at least 10 characters"),
  targetBeneficiaries: z.string().trim().optional(),
  marketSize: z.string().trim().optional(),
  businessModel: z.string().trim().optional(),
  revenueModel: z.string().trim().optional(),
  sustainabilityModel: z.string().trim().optional(),
  currentStage: z.nativeEnum(VentureStage).optional(),
});

const createCollaborationSchema = z.object({
  supportType: z.nativeEnum(SupportType, {
    errorMap: () => ({ message: "Support type must be one of: MENTORSHIP, TECHNICAL, PROTOTYPING, GENERAL_INTEREST. FUNDING is not permitted." }),
  }),
  description: z.string().trim().min(10, "Collaboration message must be at least 10 characters"),
});

const progressUpdateSchema = z.object({
  updateText: z.string().trim().min(5, "Update text must be at least 5 characters"),
  milestoneTitle: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

// =============================================================================
// 1. UNIVERSITY PROPOSALS
// =============================================================================

/**
 * POST /api/problems/:id/proposals
 * University role only. Submits a research/prototype proposal on a problem.
 * Eligible on ANY problem in Problem Bank (filterStatus = PASSED) regardless of trust signal.
 */
router.post(
  "/problems/:id/proposals",
  authenticate,
  authorizeRoles(Role.UNIVERSITY),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!req.user?.organizationId) {
      res.status(400).json({
        success: false,
        error: "Authenticated user must be associated with an institutional university organization.",
      });
      return;
    }

    const parseResult = createProposalSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const problem = await prisma.problem.findUnique({
        where: { id },
      });

      if (!problem) {
        res.status(404).json({
          success: false,
          error: `Problem with ID ${id} not found.`,
        });
        return;
      }

      if (problem.filterStatus !== FilterStatus.PASSED) {
        res.status(400).json({
          success: false,
          error: `Problem cannot accept institutional proposals because its filterStatus is ${problem.filterStatus}. Only PASSED problems in the Problem Bank are actionable.`,
        });
        return;
      }

      // Prevent duplicate active proposal from the same university on the same problem
      const existingActiveProposal = await prisma.proposal.findFirst({
        where: {
          problemId: id,
          universityId: req.user.organizationId,
          status: { not: ProposalStatus.WITHDRAWN },
        },
      });

      if (existingActiveProposal) {
        res.status(400).json({
          success: false,
          error: "An active research proposal from your university already exists for this problem.",
        });
        return;
      }

      const {
        title,
        description,
        facultyMentor,
        deliverables,
        timelineStart,
        timelineEnd,
        milestones,
        budgetRequired,
      } = parseResult.data;

      const proposal = await prisma.proposal.create({
        data: {
          problemId: id,
          universityId: req.user.organizationId,
          facultyMentor: facultyMentor || req.user.name,
          teamMembers: [
            {
              name: req.user.name,
              email: req.user.email,
              role: "Faculty Project Lead",
            },
          ],
          proposedApproach: description,
          deliverables: deliverables || title,
          timelineStart: timelineStart ? new Date(timelineStart) : new Date(),
          timelineEnd: timelineEnd ? new Date(timelineEnd) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          milestones: milestones || [
            {
              title: "Phase 1: Needs Assessment & Benchmarking",
              deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              status: "IN_PROGRESS",
            },
            {
              title: "Phase 2: Prototype Fabrication & Testing",
              deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              status: "PENDING",
            },
          ],
          budgetRequired: budgetRequired || null,
          status: ProposalStatus.SUBMITTED,
        },
        include: {
          university: {
            select: {
              id: true,
              name: true,
              type: true,
              district: true,
            },
          },
          progressUpdates: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "University proposal submitted successfully.",
        proposal: {
          ...proposal,
          title,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to submit university proposal.",
        details: error.message,
      });
    }
  }
);

/**
 * GET /api/problems/:id/proposals
 * Authenticated endpoint to view proposals attached to a problem.
 */
router.get("/problems/:id/proposals", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const proposals = await prisma.proposal.findMany({
      where: { problemId: id },
      orderBy: { createdAt: "desc" },
      include: {
        university: {
          select: {
            id: true,
            name: true,
            type: true,
            district: true,
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

// =============================================================================
// 2. STARTUP BUSINESS CONCEPTS
// =============================================================================

/**
 * POST /api/problems/:id/business-concepts
 * Startup role only. Submits a commercial or social business model for solving a civic problem.
 */
router.post(
  "/problems/:id/business-concepts",
  authenticate,
  authorizeRoles(Role.STARTUP),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!req.user?.organizationId) {
      res.status(400).json({
        success: false,
        error: "Authenticated user must be associated with a registered startup organization.",
      });
      return;
    }

    const parseResult = createBusinessConceptSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const problem = await prisma.problem.findUnique({
        where: { id },
      });

      if (!problem) {
        res.status(404).json({
          success: false,
          error: `Problem with ID ${id} not found.`,
        });
        return;
      }

      if (problem.filterStatus !== FilterStatus.PASSED) {
        res.status(400).json({
          success: false,
          error: `Problem cannot accept business concepts because its filterStatus is ${problem.filterStatus}.`,
        });
        return;
      }

      // Check for duplicate active concept from same startup on same problem
      const existingConcept = await prisma.businessConcept.findFirst({
        where: {
          problemId: id,
          startupId: req.user.organizationId,
        },
      });

      if (existingConcept) {
        res.status(400).json({
          success: false,
          error: "A business concept from your startup already exists for this problem.",
        });
        return;
      }

      const {
        title,
        description,
        targetBeneficiaries,
        marketSize,
        businessModel,
        revenueModel,
        sustainabilityModel,
        currentStage,
      } = parseResult.data;

      const concept = await prisma.businessConcept.create({
        data: {
          problemId: id,
          startupId: req.user.organizationId,
          solutionDescription: description,
          targetBeneficiaries: targetBeneficiaries || "Local citizens and community stakeholders in the affected district",
          marketSize: marketSize || title,
          businessModel: businessModel || "Direct community delivery and municipal maintenance contracts",
          revenueModel: revenueModel || "Performance-based civic service fees and maintenance agreements",
          sustainabilityModel: sustainabilityModel || "Locally trained maintenance teams and domestic component sourcing",
          currentStage: currentStage || VentureStage.CONCEPT_SUBMITTED,
        },
        include: {
          startup: {
            select: {
              id: true,
              name: true,
              type: true,
              district: true,
            },
          },
          progressUpdates: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Startup business concept submitted successfully.",
        businessConcept: {
          ...concept,
          title,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to submit startup business concept.",
        details: error.message,
      });
    }
  }
);

/**
 * GET /api/problems/:id/business-concepts
 * Authenticated endpoint to view business concepts for a problem.
 */
router.get("/problems/:id/business-concepts", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const concepts = await prisma.businessConcept.findMany({
      where: { problemId: id },
      orderBy: { createdAt: "desc" },
      include: {
        startup: {
          select: {
            id: true,
            name: true,
            type: true,
            district: true,
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

    const safeConcepts = concepts.map((c) => ({
      ...c,
      title: c.marketSize || c.solutionDescription.slice(0, 60),
    }));

    res.status(200).json({
      success: true,
      count: safeConcepts.length,
      businessConcepts: safeConcepts,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch startup business concepts.",
      details: error.message,
    });
  }
});

// =============================================================================
// 3. INDUSTRY COLLABORATIONS
// =============================================================================

/**
 * POST /api/problems/:id/collaborations
 * Industry role only. Registers non-financial institutional collaboration on a problem.
 * Support types strictly limited to: MENTORSHIP, TECHNICAL, PROTOTYPING, GENERAL_INTEREST.
 * FUNDING is strictly prohibited.
 */
router.post(
  "/problems/:id/collaborations",
  authenticate,
  authorizeRoles(Role.INDUSTRY),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!req.user?.organizationId) {
      res.status(400).json({
        success: false,
        error: "Authenticated user must be associated with a recognized industry organization.",
      });
      return;
    }

    const parseResult = createCollaborationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const problem = await prisma.problem.findUnique({
        where: { id },
      });

      if (!problem) {
        res.status(404).json({
          success: false,
          error: `Problem with ID ${id} not found.`,
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

      const { supportType, description } = parseResult.data;

      const collaboration = await prisma.collaboration.create({
        data: {
          problemId: id,
          industryId: req.user.organizationId,
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
  }
);

/**
 * GET /api/problems/:id/collaborations
 * Authenticated endpoint to view industry collaborations for a problem.
 */
router.get("/problems/:id/collaborations", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const collaborations = await prisma.collaboration.findMany({
      where: { problemId: id },
      orderBy: { createdAt: "desc" },
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

    res.status(200).json({
      success: true,
      count: collaborations.length,
      collaborations,
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
// 4. PROGRESS UPDATES
// =============================================================================

/**
 * POST /api/proposals/:id/progress
 * University only, strictly for its own proposal.
 * Inserts ProgressUpdate honoring XOR constraint: proposalId is set, businessConceptId is null.
 */
router.post(
  "/proposals/:id/progress",
  authenticate,
  authorizeRoles(Role.UNIVERSITY),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const parseResult = progressUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const proposal = await prisma.proposal.findUnique({
        where: { id },
      });

      if (!proposal) {
        res.status(404).json({
          success: false,
          error: `Proposal with ID ${id} not found.`,
        });
        return;
      }

      // Ownership check: user's organization must own the proposal
      if (proposal.universityId !== req.user?.organizationId) {
        res.status(403).json({
          success: false,
          error: "Access denied. You can only post progress updates to proposals owned by your university organization.",
        });
        return;
      }

      const { updateText, milestoneTitle, status } = parseResult.data;

      // Update proposal status if specified
      if (status && Object.values(ProposalStatus).includes(status as ProposalStatus)) {
        await prisma.proposal.update({
          where: { id },
          data: { status: status as ProposalStatus },
        });
      }

      // Create ProgressUpdate honoring XOR constraint (proposalId set, businessConceptId null)
      const progressUpdate = await prisma.progressUpdate.create({
        data: {
          proposalId: id,
          businessConceptId: null,
          updateText,
          milestoneTitle: milestoneTitle || null,
          postedById: req.user.id,
        },
        include: {
          postedBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Progress update logged successfully for proposal.",
        progressUpdate,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to log proposal progress update.",
        details: error.message,
      });
    }
  }
);

/**
 * POST /api/business-concepts/:id/progress
 * Startup only, strictly for its own business concept.
 * Inserts ProgressUpdate honoring XOR constraint: businessConceptId is set, proposalId is null.
 */
router.post(
  "/business-concepts/:id/progress",
  authenticate,
  authorizeRoles(Role.STARTUP),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const parseResult = progressUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const concept = await prisma.businessConcept.findUnique({
        where: { id },
      });

      if (!concept) {
        res.status(404).json({
          success: false,
          error: `Business concept with ID ${id} not found.`,
        });
        return;
      }

      // Ownership check: user's organization must own the concept
      if (concept.startupId !== req.user?.organizationId) {
        res.status(403).json({
          success: false,
          error: "Access denied. You can only post progress updates to business concepts owned by your startup organization.",
        });
        return;
      }

      const { updateText, milestoneTitle, status } = parseResult.data;

      // Update venture stage if specified
      if (status && Object.values(VentureStage).includes(status as VentureStage)) {
        await prisma.businessConcept.update({
          where: { id },
          data: { currentStage: status as VentureStage },
        });
      }

      // Create ProgressUpdate honoring XOR constraint (businessConceptId set, proposalId null)
      const progressUpdate = await prisma.progressUpdate.create({
        data: {
          businessConceptId: id,
          proposalId: null,
          updateText,
          milestoneTitle: milestoneTitle || null,
          postedById: req.user.id,
        },
        include: {
          postedBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Progress update logged successfully for business concept.",
        progressUpdate,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to log business concept progress update.",
        details: error.message,
      });
    }
  }
);

/**
 * POST /api/collaborations/:id/progress
 * Industry only, strictly for its own collaboration.
 * Updates collaboration status and notes without violating the ProgressUpdate XOR database constraint.
 */
router.post(
  "/collaborations/:id/progress",
  authenticate,
  authorizeRoles(Role.INDUSTRY),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const parseResult = progressUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const collaboration = await prisma.collaboration.findUnique({
        where: { id },
      });

      if (!collaboration) {
        res.status(404).json({
          success: false,
          error: `Collaboration with ID ${id} not found.`,
        });
        return;
      }

      // Ownership check: user's organization must own the collaboration
      if (collaboration.industryId !== req.user?.organizationId) {
        res.status(403).json({
          success: false,
          error: "Access denied. You can only update collaborations owned by your industry organization.",
        });
        return;
      }

      const { updateText, status } = parseResult.data;
      const newStatus =
        status && Object.values(CollaborationStatus).includes(status as CollaborationStatus)
          ? (status as CollaborationStatus)
          : CollaborationStatus.ACTIVE;

      const dateTag = new Date().toISOString().split("T")[0];
      const appendedMessage = `${collaboration.message}\n\n[Progress Update ${dateTag} by ${req.user.name}]: ${updateText}`;

      const updatedCollaboration = await prisma.collaboration.update({
        where: { id },
        data: {
          status: newStatus,
          message: appendedMessage,
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

      res.status(200).json({
        success: true,
        message: "Industry collaboration progress updated successfully.",
        collaboration: updatedCollaboration,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to update industry collaboration.",
        details: error.message,
      });
    }
  }
);

export default router;
