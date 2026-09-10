import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { Role } from "@prisma/client";

const router = Router();

const createProgressUpdateSchema = z
  .object({
    projectId: z.string().uuid().optional().nullable(),
    milestoneId: z.string().uuid().optional().nullable(),
    collaborationId: z.string().uuid().optional().nullable(),
    proposalId: z.string().uuid().optional().nullable(),
    businessConceptId: z.string().uuid().optional().nullable(),
    updateText: z
      .string()
      .trim()
      .min(10, "Progress update must be at least 10 characters")
      .max(5000, "Progress update cannot exceed 5000 characters"),
    attachmentUrl: z.string().url("Attachment must be a valid URL").optional().nullable(),
  })
  .refine(
    (data) =>
      data.projectId ||
      data.milestoneId ||
      data.collaborationId ||
      data.proposalId ||
      data.businessConceptId,
    {
      message:
        "Progress update must be associated with a Project, Milestone, Collaboration, Proposal, or BusinessConcept.",
    }
  );

/**
 * POST /api/progress-updates
 * Record a structured progress update for a Project, Milestone, or Collaboration.
 */
router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userOrgId = req.user?.organizationId;

    if (!userOrgId || userRole === Role.CITIZEN) {
      res.status(403).json({
        success: false,
        error: "Forbidden: Citizen accounts cannot post institutional progress updates.",
      });
      return;
    }

    const parseResult = createProgressUpdateSchema.safeParse(req.body);
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
      milestoneId,
      collaborationId,
      proposalId,
      businessConceptId,
      updateText,
      attachmentUrl,
    } = parseResult.data;

    let derivedProjectId = projectId || null;
    let milestoneTitle: string | null = null;

    // Check Milestone access if specified
    if (milestoneId) {
      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        include: {
          project: true,
          collaboration: true,
        },
      });

      if (!milestone) {
        res.status(404).json({ success: false, error: "Milestone not found." });
        return;
      }

      milestoneTitle = milestone.title;
      if (!derivedProjectId && milestone.projectId) {
        derivedProjectId = milestone.projectId;
      }
    }

    // Check Project access if specified
    if (derivedProjectId) {
      const project = await prisma.project.findUnique({
        where: { id: derivedProjectId },
        include: { collaborations: true },
      });

      if (!project) {
        res.status(404).json({ success: false, error: "Project not found." });
        return;
      }

      const isLead = project.leadOrgId === userOrgId;
      const isPartner = project.collaborations.some(
        (c) => c.providerOrgId === userOrgId || c.recipientOrgId === userOrgId
      );
      const isAdmin = userRole === Role.ADMIN;

      if (!isLead && !isPartner && !isAdmin) {
        res.status(403).json({
          success: false,
          error: "Access denied. You do not belong to an organization participating in this project.",
        });
        return;
      }
    }

    // Check Collaboration access if specified
    if (collaborationId) {
      const collab = await prisma.collaboration.findUnique({
        where: { id: collaborationId },
      });

      if (!collab) {
        res.status(404).json({ success: false, error: "Collaboration not found." });
        return;
      }

      const isParticipant =
        collab.providerOrgId === userOrgId ||
        collab.recipientOrgId === userOrgId;
      const isAdmin = userRole === Role.ADMIN;

      if (!isParticipant && !isAdmin) {
        res.status(403).json({
          success: false,
          error: "Access denied. You do not belong to an organization in this collaboration.",
        });
        return;
      }
    }

    const progressUpdate = await prisma.progressUpdate.create({
      data: {
        projectId: derivedProjectId,
        milestoneId: milestoneId || null,
        collaborationId: collaborationId || null,
        proposalId: proposalId || null,
        businessConceptId: businessConceptId || null,
        updateText,
        milestoneTitle,
        attachmentUrl: attachmentUrl || null,
        postedById: req.user!.id,
      },
      include: {
        postedBy: {
          select: { id: true, name: true, role: true },
        },
        milestone: {
          select: { id: true, title: true, status: true },
        },
        project: {
          select: { id: true, title: true, status: true },
        },
        collaboration: {
          select: { id: true, status: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Progress update logged successfully.",
      progressUpdate,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to log progress update.",
      details: error.message,
    });
  }
});

/**
 * GET /api/progress-updates
 * Retrieve progress update history with filters.
 */
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { projectId, milestoneId, collaborationId, proposalId, businessConceptId } = req.query;

    const where: any = {};
    if (projectId && typeof projectId === "string") where.projectId = projectId;
    if (milestoneId && typeof milestoneId === "string") where.milestoneId = milestoneId;
    if (collaborationId && typeof collaborationId === "string") where.collaborationId = collaborationId;
    if (proposalId && typeof proposalId === "string") where.proposalId = proposalId;
    if (businessConceptId && typeof businessConceptId === "string")
      where.businessConceptId = businessConceptId;

    const updates = await prisma.progressUpdate.findMany({
      where,
      include: {
        postedBy: {
          select: { id: true, name: true, role: true, district: true },
        },
        milestone: {
          select: { id: true, title: true, status: true },
        },
        project: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      count: updates.length,
      updates,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch progress updates.",
      details: error.message,
    });
  }
});

export default router;
