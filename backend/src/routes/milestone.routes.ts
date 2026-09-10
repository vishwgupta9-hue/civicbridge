import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { MilestoneStatus, Role, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library.js";

const router = Router();

const createMilestoneSchema = z
  .object({
    projectId: z.string().uuid("Invalid Project ID format").optional().nullable(),
    collaborationId: z.string().uuid("Invalid Collaboration ID format").optional().nullable(),
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
    description: z.string().trim().min(5, "Description must be at least 5 characters"),
    targetDate: z.string().datetime({ message: "targetDate must be a valid ISO datetime string" }),
    responsibleParty: z.string().trim().max(150).optional().nullable(),
    deliverableUrl: z.string().url("Deliverable URL must be valid").optional().nullable(),
  })
  .refine((data) => data.projectId || data.collaborationId, {
    message: "Milestone must be linked to either a Project or a Collaboration.",
  });

const updateMilestoneSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(5).optional(),
  targetDate: z.string().datetime().optional(),
  responsibleParty: z.string().trim().max(150).optional().nullable(),
  deliverableUrl: z.string().url().optional().nullable(),
  status: z.nativeEnum(MilestoneStatus).optional(),
});

const submitMilestoneSchema = z.object({
  deliverableUrl: z.string().url("Deliverable URL must be a valid URL"),
  notes: z.string().trim().min(5, "Submission notes must be at least 5 characters").optional().nullable(),
});

/**
 * POST /api/milestones
 * Create a structured relational milestone for a Project and/or Collaboration.
 */
router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userOrgId = req.user?.organizationId;

    if (!userOrgId || userRole === Role.CITIZEN) {
      res.status(403).json({
        success: false,
        error: "Forbidden: Citizen accounts cannot create project milestones.",
      });
      return;
    }

    const parseResult = createMilestoneSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const {
      projectId,
      collaborationId,
      title,
      description,
      targetDate,
      responsibleParty,
      deliverableUrl,
    } = parseResult.data;

    // Check project authorization if projectId provided
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { collaborations: true },
      });

      if (!project) {
        res.status(404).json({ success: false, error: "Project not found." });
        return;
      }

      const isLeadOrg = project.leadOrgId === userOrgId;
      const isCollabPartner = project.collaborations.some(
        (c) => c.providerOrgId === userOrgId || c.recipientOrgId === userOrgId
      );
      const isAdmin = userRole === Role.ADMIN;

      if (!isLeadOrg && !isCollabPartner && !isAdmin) {
        res.status(403).json({
          success: false,
          error: "Access denied. You must be the project lead or an active collaboration partner to add milestones.",
        });
        return;
      }
    }

    // Check collaboration authorization if collaborationId provided
    if (collaborationId) {
      const collaboration = await prisma.collaboration.findUnique({
        where: { id: collaborationId },
      });

      if (!collaboration) {
        res.status(404).json({ success: false, error: "Collaboration not found." });
        return;
      }

      const isParticipant =
        collaboration.providerOrgId === userOrgId ||
        collaboration.recipientOrgId === userOrgId;
      const isAdmin = userRole === Role.ADMIN;

      if (!isParticipant && !isAdmin) {
        res.status(403).json({
          success: false,
          error: "Access denied. You must belong to a participating organization in this collaboration.",
        });
        return;
      }
    }

    const milestone = await prisma.milestone.create({
      data: {
        projectId: projectId || null,
        collaborationId: collaborationId || null,
        title,
        description,
        targetDate: new Date(targetDate),
        responsibleParty: responsibleParty || null,
        deliverableUrl: deliverableUrl || null,
        status: MilestoneStatus.PENDING,
      },
      include: {
        project: {
          select: { id: true, title: true, status: true },
        },
        collaboration: {
          select: { id: true, status: true, contributionScope: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Milestone created successfully.",
      milestone,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to create milestone.",
      details: error.message,
    });
  }
});

/**
 * GET /api/milestones
 * List milestones with query filters.
 */
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { projectId, collaborationId, status } = req.query;

    const where: any = {};
    if (projectId && typeof projectId === "string") {
      where.projectId = projectId;
    }
    if (collaborationId && typeof collaborationId === "string") {
      where.collaborationId = collaborationId;
    }
    if (status && Object.values(MilestoneStatus).includes(status as MilestoneStatus)) {
      where.status = status as MilestoneStatus;
    }

    const milestones = await prisma.milestone.findMany({
      where,
      include: {
        project: {
          select: { id: true, title: true, trackType: true },
        },
        collaboration: {
          select: { id: true, status: true, providerOrgId: true, recipientOrgId: true },
        },
        verifiedByOrg: {
          select: { id: true, name: true, type: true },
        },
        _count: {
          select: { progressUpdates: true },
        },
      },
      orderBy: { targetDate: "asc" },
    });

    res.json({
      success: true,
      count: milestones.length,
      milestones,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch milestones.",
      details: error.message,
    });
  }
});

/**
 * GET /api/milestones/:id
 * Retrieve single milestone details with attached progress updates.
 */
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        project: {
          include: { leadOrg: true },
        },
        collaboration: {
          include: { providerOrg: true, recipientOrg: true },
        },
        verifiedByOrg: true,
        progressUpdates: {
          include: {
            postedBy: {
              select: { id: true, name: true, role: true, organizationId: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!milestone) {
      res.status(404).json({ success: false, error: "Milestone not found." });
      return;
    }

    res.json({
      success: true,
      milestone,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve milestone.",
      details: error.message,
    });
  }
});

/**
 * PATCH /api/milestones/:id
 * Update milestone details or status.
 */
router.patch("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userOrgId = req.user?.organizationId;

    if (!userOrgId || userRole === Role.CITIZEN) {
      res.status(403).json({ success: false, error: "Forbidden." });
      return;
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        project: true,
        collaboration: true,
      },
    });

    if (!milestone) {
      res.status(404).json({ success: false, error: "Milestone not found." });
      return;
    }

    // Access check
    const isProjectLead = milestone.project?.leadOrgId === userOrgId;
    const isCollabPartner =
      milestone.collaboration?.providerOrgId === userOrgId ||
      milestone.collaboration?.recipientOrgId === userOrgId;
    const isAdmin = userRole === Role.ADMIN;

    if (!isProjectLead && !isCollabPartner && !isAdmin) {
      res.status(403).json({
        success: false,
        error: "Access denied. You cannot modify milestones for this project or collaboration.",
      });
      return;
    }

    const parseResult = updateMilestoneSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { title, description, targetDate, responsibleParty, deliverableUrl, status } =
      parseResult.data;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (targetDate !== undefined) data.targetDate = new Date(targetDate);
    if (responsibleParty !== undefined) data.responsibleParty = responsibleParty;
    if (deliverableUrl !== undefined) data.deliverableUrl = deliverableUrl;
    if (status !== undefined) data.status = status;

    const updated = await prisma.milestone.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      message: "Milestone updated successfully.",
      milestone: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to update milestone.",
      details: error.message,
    });
  }
});

/**
 * POST /api/milestones/:id/submit
 * Submit deliverable proof for milestone review.
 */
router.post("/:id/submit", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userOrgId = req.user?.organizationId;
    const isAdmin = req.user?.role === Role.ADMIN;

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: { project: true, collaboration: true },
    });

    if (!milestone) {
      res.status(404).json({ success: false, error: "Milestone not found." });
      return;
    }

    const parseResult = submitMilestoneSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { deliverableUrl, notes } = parseResult.data;

    const updated = await prisma.$transaction(async (tx: Omit<PrismaClient<any, any, DefaultArgs>, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
      const m = await tx.milestone.update({
        where: { id },
        data: {
          deliverableUrl,
          status: MilestoneStatus.SUBMITTED,
        },
      });

      // Record a progress update
      await tx.progressUpdate.create({
        data: {
          milestoneId: id,
          projectId: milestone.projectId,
          collaborationId: milestone.collaborationId,
          updateText: notes || `Deliverable submitted for milestone "${milestone.title}": ${deliverableUrl}`,
          milestoneTitle: milestone.title,
          attachmentUrl: deliverableUrl,
          postedById: req.user!.id,
        },
      });

      return m;
    });

    res.json({
      success: true,
      message: "Milestone deliverable submitted for review.",
      milestone: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to submit milestone deliverable.",
      details: error.message,
    });
  }
});

/**
 * POST /api/milestones/:id/verify
 * Reviewer verifies completed milestone.
 */
router.post("/:id/verify", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userOrgId = req.user?.organizationId;
    const userRole = req.user?.role;
    const isAdmin = userRole === Role.ADMIN;

    if (!userOrgId || userRole === Role.CITIZEN) {
      res.status(403).json({ success: false, error: "Forbidden." });
      return;
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: { project: true, collaboration: true },
    });

    if (!milestone) {
      res.status(404).json({ success: false, error: "Milestone not found." });
      return;
    }

    if (milestone.status !== MilestoneStatus.SUBMITTED && milestone.status !== MilestoneStatus.IN_PROGRESS) {
      res.status(400).json({
        success: false,
        error: `Cannot verify milestone in status '${milestone.status}'. Milestone should be SUBMITTED or IN_PROGRESS.`,
      });
      return;
    }

    // Must be project lead org, or collaboration recipient/partner, or admin
    const isProjectLead = milestone.project?.leadOrgId === userOrgId;
    const isCollabRecipient = milestone.collaboration?.recipientOrgId === userOrgId;

    if (!isProjectLead && !isCollabRecipient && !isAdmin) {
      res.status(403).json({
        success: false,
        error: "Access denied. Only the project lead, recipient organization, or admin can verify milestone completion.",
      });
      return;
    }

    const updated = await prisma.$transaction(async (tx: Omit<PrismaClient<any, any, DefaultArgs>, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
      const m = await tx.milestone.update({
        where: { id },
        data: {
          status: MilestoneStatus.VERIFIED,
          verifiedByOrgId: userOrgId,
          verifiedAt: new Date(),
        },
        include: { verifiedByOrg: true },
      });

      await tx.progressUpdate.create({
        data: {
          milestoneId: id,
          projectId: milestone.projectId,
          collaborationId: milestone.collaborationId,
          updateText: `Milestone "${milestone.title}" successfully verified and confirmed by ${req.user!.name}.`,
          milestoneTitle: milestone.title,
          postedById: req.user!.id,
        },
      });

      return m;
    });

    res.json({
      success: true,
      message: "Milestone verified successfully.",
      milestone: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to verify milestone.",
      details: error.message,
    });
  }
});

/**
 * DELETE /api/milestones/:id
 * Delete a milestone (only when PENDING).
 */
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userOrgId = req.user?.organizationId;
    const isAdmin = req.user?.role === Role.ADMIN;

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: { project: true, collaboration: true },
    });

    if (!milestone) {
      res.status(404).json({ success: false, error: "Milestone not found." });
      return;
    }

    if (milestone.status !== MilestoneStatus.PENDING) {
      res.status(400).json({
        success: false,
        error: `Cannot delete milestone in '${milestone.status}' status. Only PENDING milestones can be removed.`,
      });
      return;
    }

    const isProjectLead = milestone.project?.leadOrgId === userOrgId;
    const isCollabInitiator = milestone.collaboration?.recipientOrgId === userOrgId || milestone.collaboration?.providerOrgId === userOrgId;

    if (!isProjectLead && !isCollabInitiator && !isAdmin) {
      res.status(403).json({ success: false, error: "Access denied." });
      return;
    }

    await prisma.milestone.delete({ where: { id } });

    res.json({
      success: true,
      message: "Milestone deleted successfully.",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to delete milestone.",
      details: error.message,
    });
  }
});

export default router;
