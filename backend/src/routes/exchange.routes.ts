import { Router, Request, Response } from "express";
import { z } from "zod";
import { Role, OfferCategory, NeedUrgency, NeedStatus } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// Validation Schemas
const createOfferSchema = z.object({
  category: z.nativeEnum(OfferCategory, {
    errorMap: () => ({ message: "Invalid offer category" }),
  }),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  specifications: z.string().trim().min(5, "Specifications must be at least 5 characters"),
  district: z.string().trim().optional(),
  capacityTerms: z.string().trim().optional(),
});

const updateOfferSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  specifications: z.string().trim().min(5).optional(),
  district: z.string().trim().optional(),
  capacityTerms: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
});

const createNeedSchema = z.object({
  category: z.nativeEnum(OfferCategory, {
    errorMap: () => ({ message: "Invalid need category" }),
  }),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  details: z.string().trim().min(5, "Details must be at least 5 characters"),
  district: z.string().trim().optional(),
  urgency: z.nativeEnum(NeedUrgency).optional().default(NeedUrgency.STANDARD),
  projectId: z.string().uuid().optional(),
  milestoneId: z.string().uuid().optional(),
});

const updateNeedSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  details: z.string().trim().min(5).optional(),
  district: z.string().trim().optional(),
  urgency: z.nativeEnum(NeedUrgency).optional(),
  status: z.nativeEnum(NeedStatus).optional(),
});

const linkProjectSchema = z.object({
  projectId: z.string().uuid("Invalid project UUID"),
  milestoneId: z.string().uuid("Invalid milestone UUID").optional(),
});

// =============================================================================
// OFFER ENDPOINTS
// =============================================================================

/**
 * POST /api/offers
 * Create an institutional capability or resource Offer.
 * Accessible to any institutional organization (GOVERNMENT, UNIVERSITY, STARTUP, INDUSTRY).
 */
router.post(
  "/offers",
  authenticate,
  authorizeRoles(Role.UNIVERSITY, Role.STARTUP, Role.INDUSTRY, Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      if (!user.organizationId) {
        res.status(400).json({
          success: false,
          error: "User must belong to an Organization to publish an Offer.",
        });
        return;
      }

      const parsed = createOfferSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { category, title, specifications, district, capacityTerms } = parsed.data;

      const offer = await prisma.offer.create({
        data: {
          providerOrgId: user.organizationId,
          category,
          title,
          specifications,
          district: district || user.district || undefined,
          capacityTerms,
          status: "ACTIVE",
        },
        include: {
          providerOrg: {
            select: {
              id: true,
              name: true,
              type: true,
              district: true,
              domainTags: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Offer published successfully",
        offer,
      });
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create offer",
      });
    }
  }
);

/**
 * GET /api/offers
 * List and filter published Offers.
 */
router.get("/offers", authenticate, async (req: Request, res: Response) => {
  try {
    const { category, district, providerOrgId, status = "ACTIVE", search, page = "1", limit = "20" } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (category && Object.values(OfferCategory).includes(category as OfferCategory)) {
      where.category = category as OfferCategory;
    }

    if (district && typeof district === "string") {
      where.district = { contains: district, mode: "insensitive" };
    }

    if (providerOrgId && typeof providerOrgId === "string") {
      where.providerOrgId = providerOrgId;
    }

    if (status && typeof status === "string") {
      where.status = status;
    }

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { specifications: { contains: q, mode: "insensitive" } },
        { capacityTerms: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, offers] = await Promise.all([
      prisma.offer.count({ where }),
      prisma.offer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          providerOrg: {
            select: {
              id: true,
              name: true,
              type: true,
              district: true,
              domainTags: true,
            },
          },
          _count: {
            select: {
              collaborations: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      offers,
    });
  } catch (error) {
    console.error("Error listing offers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch offers",
    });
  }
});

/**
 * GET /api/offers/:id
 * Retrieve a single Offer's details.
 */
router.get("/offers/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        providerOrg: {
          select: {
            id: true,
            name: true,
            type: true,
            district: true,
            state: true,
            contactEmail: true,
            domainTags: true,
            expertiseTags: true,
          },
        },
        collaborations: {
          select: {
            id: true,
            status: true,
            contributionScope: true,
            expectedCompletionDate: true,
            createdAt: true,
            recipientOrg: {
              select: { id: true, name: true, type: true },
            },
          },
        },
      },
    });

    if (!offer) {
      res.status(404).json({ success: false, error: "Offer not found" });
      return;
    }

    res.json({ success: true, offer });
  } catch (error) {
    console.error("Error fetching offer:", error);
    res.status(500).json({ success: false, error: "Failed to fetch offer details" });
  }
});

/**
 * PATCH /api/offers/:id
 * Update an existing Offer. (Provider organization or Admin only).
 */
router.patch("/offers/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const offer = await prisma.offer.findUnique({
      where: { id },
      select: { id: true, providerOrgId: true },
    });

    if (!offer) {
      res.status(404).json({ success: false, error: "Offer not found" });
      return;
    }

    if (user.organizationId !== offer.providerOrgId && user.role !== Role.ADMIN) {
      res.status(403).json({ success: false, error: "Unauthorized to update this offer." });
      return;
    }

    const parsed = updateOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const updated = await prisma.offer.update({
      where: { id },
      data: parsed.data,
      include: {
        providerOrg: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    res.json({ success: true, message: "Offer updated successfully", offer: updated });
  } catch (error) {
    console.error("Error updating offer:", error);
    res.status(500).json({ success: false, error: "Failed to update offer" });
  }
});

// =============================================================================
// NEED ENDPOINTS
// =============================================================================

/**
 * POST /api/needs
 * Create a resource or capability Need.
 * Can exist standalone (no projectId) or attached to a Project / Milestone.
 */
router.post(
  "/needs",
  authenticate,
  authorizeRoles(Role.UNIVERSITY, Role.STARTUP, Role.INDUSTRY, Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      if (!user.organizationId) {
        res.status(400).json({
          success: false,
          error: "User must belong to an Organization to post a Need.",
        });
        return;
      }

      const parsed = createNeedSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { category, title, details, district, urgency, projectId, milestoneId } = parsed.data;

      // If projectId is passed, verify project exists
      if (projectId) {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { id: true, leadOrgId: true },
        });

        if (!project) {
          res.status(404).json({ success: false, error: "Referenced project not found." });
          return;
        }

        // Must be lead org member or Admin to attach to project
        if (project.leadOrgId !== user.organizationId && user.role !== Role.ADMIN) {
          res.status(403).json({
            success: false,
            error: "Only lead organization members or admin can attach a Need to this Project.",
          });
          return;
        }
      }

      // If milestoneId is passed, verify milestone belongs to project
      if (milestoneId) {
        if (!projectId) {
          res.status(400).json({
            success: false,
            error: "Cannot specify milestoneId without a projectId.",
          });
          return;
        }

        const milestone = await prisma.milestone.findUnique({
          where: { id: milestoneId },
          select: { id: true, projectId: true },
        });

        if (!milestone || milestone.projectId !== projectId) {
          res.status(404).json({
            success: false,
            error: "Milestone not found or does not belong to specified Project.",
          });
          return;
        }
      }

      const need = await prisma.need.create({
        data: {
          creatorOrgId: user.organizationId,
          category,
          title,
          details,
          district: district || user.district || undefined,
          urgency,
          status: NeedStatus.OPEN,
          projectId: projectId || undefined,
          milestoneId: milestoneId || undefined,
        },
        include: {
          creatorOrg: {
            select: { id: true, name: true, type: true, district: true },
          },
          project: {
            select: { id: true, title: true, trackType: true, status: true },
          },
          milestone: {
            select: { id: true, title: true, targetDate: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Need created successfully",
        need,
      });
    } catch (error) {
      console.error("Error creating need:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create need",
      });
    }
  }
);

/**
 * GET /api/needs
 * List and filter Needs.
 */
router.get("/needs", authenticate, async (req: Request, res: Response) => {
  try {
    const { category, urgency, status, projectId, creatorOrgId, district, search, page = "1", limit = "20" } =
      req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (category && Object.values(OfferCategory).includes(category as OfferCategory)) {
      where.category = category as OfferCategory;
    }

    if (urgency && Object.values(NeedUrgency).includes(urgency as NeedUrgency)) {
      where.urgency = urgency as NeedUrgency;
    }

    if (status && Object.values(NeedStatus).includes(status as NeedStatus)) {
      where.status = status as NeedStatus;
    }

    if (projectId && typeof projectId === "string") {
      where.projectId = projectId;
    }

    if (creatorOrgId && typeof creatorOrgId === "string") {
      where.creatorOrgId = creatorOrgId;
    }

    if (district && typeof district === "string") {
      where.district = { contains: district, mode: "insensitive" };
    }

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { details: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, needs] = await Promise.all([
      prisma.need.count({ where }),
      prisma.need.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
        include: {
          creatorOrg: {
            select: { id: true, name: true, type: true, district: true },
          },
          project: {
            select: { id: true, title: true, trackType: true, status: true },
          },
          milestone: {
            select: { id: true, title: true, targetDate: true },
          },
          _count: {
            select: { collaborations: true },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      needs,
    });
  } catch (error) {
    console.error("Error listing needs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch needs",
    });
  }
});

/**
 * GET /api/needs/:id
 * Retrieve specific Need details.
 */
router.get("/needs/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const need = await prisma.need.findUnique({
      where: { id },
      include: {
        creatorOrg: {
          select: {
            id: true,
            name: true,
            type: true,
            district: true,
            state: true,
            contactEmail: true,
            domainTags: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            trackType: true,
            status: true,
            problems: {
              select: {
                problem: {
                  select: { id: true, title: true, district: true, category: true },
                },
              },
            },
          },
        },
        milestone: {
          select: { id: true, title: true, targetDate: true, status: true },
        },
        collaborations: {
          include: {
            providerOrg: {
              select: { id: true, name: true, type: true },
            },
            offer: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    if (!need) {
      res.status(404).json({ success: false, error: "Need not found" });
      return;
    }

    res.json({ success: true, need });
  } catch (error) {
    console.error("Error fetching need:", error);
    res.status(500).json({ success: false, error: "Failed to fetch need details" });
  }
});

/**
 * PATCH /api/needs/:id
 * Update Need details or status.
 */
router.patch("/needs/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const need = await prisma.need.findUnique({
      where: { id },
      select: { id: true, creatorOrgId: true },
    });

    if (!need) {
      res.status(404).json({ success: false, error: "Need not found" });
      return;
    }

    if (user.organizationId !== need.creatorOrgId && user.role !== Role.ADMIN) {
      res.status(403).json({ success: false, error: "Unauthorized to update this need." });
      return;
    }

    const parsed = updateNeedSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const updated = await prisma.need.update({
      where: { id },
      data: parsed.data,
      include: {
        creatorOrg: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    res.json({ success: true, message: "Need updated successfully", need: updated });
  } catch (error) {
    console.error("Error updating need:", error);
    res.status(500).json({ success: false, error: "Failed to update need" });
  }
});

/**
 * POST /api/needs/:id/link-project
 * Link a previously standalone Need to a Project.
 */
router.post("/needs/:id/link-project", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const need = await prisma.need.findUnique({
      where: { id },
      select: { id: true, creatorOrgId: true },
    });

    if (!need) {
      res.status(404).json({ success: false, error: "Need not found" });
      return;
    }

    const parsed = linkProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { projectId, milestoneId } = parsed.data;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, leadOrgId: true },
    });

    if (!project) {
      res.status(404).json({ success: false, error: "Project not found." });
      return;
    }

    if (project.leadOrgId !== user.organizationId && user.role !== Role.ADMIN) {
      res.status(403).json({
        success: false,
        error: "Unauthorized: only lead organization or admin can link needs to this project.",
      });
      return;
    }

    if (milestoneId) {
      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        select: { id: true, projectId: true },
      });

      if (!milestone || milestone.projectId !== projectId) {
        res.status(400).json({
          success: false,
          error: "Milestone does not belong to specified project.",
        });
        return;
      }
    }

    const updated = await prisma.need.update({
      where: { id },
      data: {
        projectId,
        milestoneId: milestoneId || null,
      },
      include: {
        project: {
          select: { id: true, title: true, trackType: true },
        },
        milestone: {
          select: { id: true, title: true },
        },
      },
    });

    res.json({
      success: true,
      message: "Need linked to project successfully",
      need: updated,
    });
  } catch (error) {
    console.error("Error linking need to project:", error);
    res.status(500).json({
      success: false,
      error: "Failed to link need to project",
    });
  }
});

// =============================================================================
// NEED <-> OFFER DETERMINISTIC MATCHING
// =============================================================================

import { MatchingService } from "../services/matching.service.js";

/**
 * GET /api/needs/:id/matches
 * Deterministically find and rank compatible active Offers for a specific Need.
 */
router.get("/needs/:id/matches", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const minScore = req.query.minScore ? parseInt(req.query.minScore as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const matches = await MatchingService.matchOffersForNeed(id, { minScore, limit });

    res.json({
      success: true,
      needId: id,
      count: matches.length,
      matches,
    });
  } catch (error: any) {
    const statusCode = error.message?.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to find matching offers for need.",
    });
  }
});

/**
 * GET /api/offers/:id/matches
 * Deterministically find and rank compatible open Needs for a specific Offer.
 */
router.get("/offers/:id/matches", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const minScore = req.query.minScore ? parseInt(req.query.minScore as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const matches = await MatchingService.matchNeedsForOffer(id, { minScore, limit });

    res.json({
      success: true,
      offerId: id,
      count: matches.length,
      matches,
    });
  } catch (error: any) {
    const statusCode = error.message?.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to find matching needs for offer.",
    });
  }
});

/**
 * GET /api/matches
 * Unified endpoint accepting ?needId=... or ?offerId=...
 */
router.get("/matches", authenticate, async (req: Request, res: Response) => {
  try {
    const { needId, offerId, minScore, limit } = req.query;
    const parsedMinScore = minScore ? parseInt(minScore as string, 10) : undefined;
    const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;

    if (needId && typeof needId === "string") {
      const matches = await MatchingService.matchOffersForNeed(needId, {
        minScore: parsedMinScore,
        limit: parsedLimit,
      });
      res.json({
        success: true,
        type: "OFFERS_FOR_NEED",
        needId,
        count: matches.length,
        matches,
      });
      return;
    }

    if (offerId && typeof offerId === "string") {
      const matches = await MatchingService.matchNeedsForOffer(offerId, {
        minScore: parsedMinScore,
        limit: parsedLimit,
      });
      res.json({
        success: true,
        type: "NEEDS_FOR_OFFER",
        offerId,
        count: matches.length,
        matches,
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: "Must provide either 'needId' or 'offerId' query parameter.",
    });
  } catch (error: any) {
    const statusCode = error.message?.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to find matches.",
    });
  }
});

export default router;
