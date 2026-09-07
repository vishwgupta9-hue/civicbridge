import { Router, Request, Response } from "express";
import { z } from "zod";
import { Role, ProblemStatus, FilterStatus, VerificationStatus, PriorityTier } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

import { aiService } from "../services/ai/ai.service.js";

const router = Router();

export const createProblemSchema = z.object({
  title: z
    .string({ required_error: "Title is required" })
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title cannot exceed 200 characters"),
  description: z
    .string({ required_error: "Description is required" })
    .trim()
    .min(15, "Description must be at least 15 characters")
    .max(3000, "Description cannot exceed 3000 characters"),
  category: z
    .string({ required_error: "Category is required" })
    .trim()
    .min(2, "Category is required"),
  district: z
    .string({ required_error: "District is required" })
    .trim()
    .min(2, "District is required"),
  subCategory: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  locationText: z.string().trim().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  affectedCount: z.coerce.number().int().min(1, "Affected count must be at least 1").optional().default(1),
  evidenceUrl: z.string().trim().url("Invalid URL format for evidence").optional().nullable().or(z.literal("")),
});

/**
 * GET /api/problems
 * Statewide Problem Bank endpoint.
 * Accessible by all authenticated roles (CITIZEN, ADMIN, UNIVERSITY, INDUSTRY, STARTUP).
 * Only returns problems that have passed AI relevance screening (filterStatus = PASSED).
 * Government verification is an advisory trust signal and NOT required for visibility.
 */
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const {
      district,
      category,
      priorityTier,
      verificationStatus,
      search,
      q,
      page = "1",
      limit = "12",
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    // Base filter: STRICTLY filterStatus = PASSED
    const whereClause: any = {
      filterStatus: FilterStatus.PASSED,
    };

    if (district && typeof district === "string" && district.trim()) {
      whereClause.district = {
        equals: district.trim(),
        mode: "insensitive",
      };
    }

    if (category && typeof category === "string" && category.trim()) {
      whereClause.category = {
        equals: category.trim(),
        mode: "insensitive",
      };
    }

    if (priorityTier && typeof priorityTier === "string" && Object.values(PriorityTier).includes(priorityTier as PriorityTier)) {
      whereClause.priorityTier = priorityTier as PriorityTier;
    }

    if (verificationStatus && typeof verificationStatus === "string" && Object.values(VerificationStatus).includes(verificationStatus as VerificationStatus)) {
      whereClause.verificationStatus = verificationStatus as VerificationStatus;
    }

    const searchQuery = (search || q) as string | undefined;
    if (searchQuery && typeof searchQuery === "string" && searchQuery.trim()) {
      const term = searchQuery.trim();
      whereClause.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { subCategory: { contains: term, mode: "insensitive" } },
        { locationText: { contains: term, mode: "insensitive" } },
      ];
    }

    // Default sorting: HIGH priority first, then MEDIUM, then LOW (via priorityScore DESC), then newest first (createdAt DESC)
    const orderBy: any = [
      { priorityScore: "desc" },
      { createdAt: "desc" },
    ];

    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limitNum,
        include: {
          aiAnalysis: {
            select: {
              id: true,
              aiSummary: true,
              predictedCategory: true,
              confidenceScore: true,
              isDuplicate: true,
              duplicateSimilarity: true,
              similarProblemIds: true,
              severityScore: true,
              affectedPeopleScore: true,
              frequencyScore: true,
              evidenceScore: true,
              urgencyScore: true,
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
      }),
      prisma.problem.count({
        where: whereClause,
      }),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.status(200).json({
      success: true,
      problems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch Problem Bank problems.",
      details: error.message,
    });
  }
});

/**
 * POST /api/problems
 * Authenticated endpoint for citizens to submit community civic problems.
 * Restricted strictly to the CITIZEN role.
 */
router.post(
  "/",
  authenticate,
  authorizeRoles(Role.CITIZEN),
  async (req: Request, res: Response) => {
    const parseResult = createProblemSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const data = parseResult.data;
    const resolvedLocationText = data.locationText || data.location || null;
    const resolvedEvidenceUrl = data.evidenceUrl ? data.evidenceUrl : null;

    try {
      // Create problem strictly bound to authenticated user's ID
      // Explicitly set initial status, filterStatus, verificationStatus, priorityScore, and priorityTier
      const newProblem = await prisma.problem.create({
        data: {
          title: data.title,
          description: data.description,
          category: data.category,
          subCategory: data.subCategory || null,
          district: data.district,
          locationText: resolvedLocationText,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          affectedCount: data.affectedCount,
          evidenceUrl: resolvedEvidenceUrl,

          // Mandatory initial state for Phase 4A
          status: ProblemStatus.OPEN,
          filterStatus: FilterStatus.PENDING,
          verificationStatus: VerificationStatus.AI_SCREENED,
          priorityScore: 0.0,
          priorityTier: PriorityTier.LOW,
          verificationRequested: false,

          // Submitter is strictly authenticated user ID
          submittedById: req.user!.id,
        },
        include: {
          submittedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              district: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        problem: newProblem,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to create civic problem record.",
      });
    }
  }
);

/**
 * POST /api/problems/:id/process-ai
 * Authenticated pipeline trigger to run AI screening and analysis on a PENDING problem.
 * Citizens cannot provide arbitrary AI results; the engine autonomously analyzes the DB record.
 */
router.post("/:id/process-ai", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

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

    // Only problems with filterStatus = PENDING can be processed
    if (problem.filterStatus !== FilterStatus.PENDING) {
      res.status(400).json({
        success: false,
        error: `Problem has already been processed by AI screening (current filterStatus: ${problem.filterStatus}). Only PENDING problems can be processed.`,
      });
      return;
    }

    // Authorization: User must be the submitter or have an institutional/admin role
    const isOwner = problem.submittedById === req.user!.id;
    const isAdmin = req.user!.role === Role.ADMIN;
    if (!isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        error: "Only the submitting citizen or an administrator can trigger AI processing on this problem.",
      });
      return;
    }

    // Execute the autonomous AI pipeline
    const { problem: updatedProblem, aiAnalysis, result } = await aiService.processProblem(problem);

    res.status(200).json({
      success: true,
      problem: updatedProblem,
      aiAnalysis,
      summary: {
        filterStatus: result.filterStatus,
        priorityScore: result.priorityScore,
        priorityTier: result.priorityTier,
        isDuplicate: result.isDuplicate,
        duplicateSimilarity: result.duplicateSimilarity,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || "Failed to execute AI problem analysis pipeline.",
    });
  }
});

/**
 * GET /api/problems/:id
 * Retrieve problem details along with AI analysis and verification data.
 */
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const problem = await prisma.problem.findUnique({
      where: { id },
      include: {
        aiAnalysis: true,
        validation: true,
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            district: true,
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
        proposals: {
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
        },
        businessConcepts: {
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
        },
        collaborations: {
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
        },
        _count: {
          select: {
            proposals: true,
            businessConcepts: true,
            collaborations: true,
          },
        },
      },
    });

    if (!problem) {
      res.status(404).json({
        success: false,
        error: `Problem with ID ${id} not found.`,
      });
      return;
    }

    const safeProposals = problem.proposals.map((p) => ({
      ...p,
      title: p.deliverables?.split("\n")[0] || p.proposedApproach.slice(0, 60),
    }));

    const safeConcepts = problem.businessConcepts.map((c) => ({
      ...c,
      title: c.marketSize || c.solutionDescription.slice(0, 60),
    }));

    res.status(200).json({
      success: true,
      problem: {
        ...problem,
        proposals: safeProposals,
        businessConcepts: safeConcepts,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      error: "Failed to fetch problem record.",
    });
  }
});

export default router;
