import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { CollaborationStatus, NeedStatus, Role, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library.js";

const router = Router();

// Validation schema for creating a collaboration proposal (supports both Need and Offer driven requests)
const createCollaborationSchema = z.object({
  needId: z.string().uuid("Invalid Need ID format").optional().nullable(),
  offerId: z.string().uuid("Invalid Offer ID format").optional().nullable(),
  providerOrgId: z.string().uuid("Invalid provider org ID format").optional().nullable(),
  recipientOrgId: z.string().uuid("Invalid recipient org ID format").optional().nullable(),
  contributionScope: z
    .string()
    .trim()
    .min(5, "Contribution scope must be at least 5 characters")
    .max(5000, "Contribution scope cannot exceed 5000 characters")
    .optional(),
  terms: z
    .string()
    .trim()
    .min(5, "Terms must be at least 5 characters")
    .max(5000, "Terms cannot exceed 5000 characters")
    .optional(),
  expectedCompletionDate: z.string().optional().nullable(),
});

// Validation schema for deliverable submission
const deliverCollaborationSchema = z.object({
  proofDocumentUrl: z.string().url("Proof document URL must be a valid URL").optional().nullable(),
  completionNotes: z.string().trim().min(5, "Completion notes must be at least 5 characters"),
});

// Validation schema for decline/cancel notes
const notesSchema = z.object({
  notes: z.string().trim().max(1000).optional().nullable(),
  reason: z.string().trim().max(1000).optional().nullable(),
});

/**
 * POST /api/collaborations and POST /api/collaborations/request
 * Create a structured collaboration commitment request between an Offer and/or a Need.
 * RBAC: Institutional roles (UNIVERSITY, STARTUP, INDUSTRY, ADMIN).
 */
router.post(["/", "/request"], authenticate, async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userOrgId = req.user?.organizationId;

    if (!userOrgId || userRole === Role.CITIZEN) {
      res.status(403).json({
        success: false,
        error: "Forbidden: Citizen accounts cannot initiate institutional collaborations.",
      });
      return;
    }

    const parseResult = createCollaborationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const {
      needId,
      offerId,
      expectedCompletionDate,
    } = parseResult.data;

    const contributionScope =
      parseResult.data.contributionScope ||
      parseResult.data.terms ||
      "Bilateral institutional collaboration commitment";

    if (!needId && !offerId) {
      res.status(400).json({
        success: false,
        error: "Either needId or offerId must be specified to initiate a collaboration.",
      });
      return;
    }

    // Fetch Need if specified
    const need = needId
      ? await prisma.need.findUnique({
          where: { id: needId },
          include: {
            creatorOrg: true,
            project: {
              include: {
                problems: true,
              },
            },
          },
        })
      : null;

    if (needId && !need) {
      res.status(404).json({ success: false, error: "Specified Need not found." });
      return;
    }

    // Fetch Offer if specified
    const offer = offerId
      ? await prisma.offer.findUnique({
          where: { id: offerId },
          include: { providerOrg: true },
        })
      : null;

    if (offerId && !offer) {
      res.status(404).json({ success: false, error: "Specified Offer not found." });
      return;
    }

    // Validate active states
    if (offer && offer.status !== "ACTIVE") {
      res.status(400).json({
        success: false,
        error: `Cannot propose collaboration on an Offer with status '${offer.status}'. Offer must be ACTIVE.`,
      });
      return;
    }

    if (need && (need.status === NeedStatus.CANCELLED || need.status === NeedStatus.FULFILLED)) {
      res.status(400).json({
        success: false,
        error: `Cannot propose collaboration on a Need with status '${need.status}'.`,
      });
      return;
    }

    // Resolve providerOrgId and recipientOrgId
    const resolvedProviderOrgId =
      offer?.providerOrgId ||
      parseResult.data.providerOrgId ||
      (need && need.creatorOrgId !== userOrgId ? userOrgId : null);

    const resolvedRecipientOrgId =
      need?.creatorOrgId ||
      parseResult.data.recipientOrgId ||
      (offer && offer.providerOrgId !== userOrgId ? userOrgId : null);

    if (!resolvedProviderOrgId || !resolvedRecipientOrgId) {
      res.status(400).json({
        success: false,
        error: "Both provider and recipient organizations must be identifiable.",
      });
      return;
    }

    // Prevent self-collaboration
    if (resolvedProviderOrgId === resolvedRecipientOrgId) {
      res.status(400).json({
        success: false,
        error: "Self-collaboration is not permitted. An organization cannot collaborate with itself.",
      });
      return;
    }

    // Check duplicate active request
    if (needId && offerId) {
      const existingActive = await prisma.collaboration.findFirst({
        where: {
          needId,
          offerId,
          status: {
            in: [
              CollaborationStatus.PROPOSED,
              CollaborationStatus.ACCEPTED,
              CollaborationStatus.IN_PROGRESS,
            ],
          },
        },
      });

      if (existingActive) {
        res.status(400).json({
          success: false,
          error: `An active collaboration already exists for this Need and Offer in state '${existingActive.status}'.`,
        });
        return;
      }
    }

    // Determine primary problem ID if available
    const primaryProblemId = need?.project?.problems[0]?.problemId || null;

    // Fetch org details to set legacy industryId
    const [provOrg, recipOrg] = await Promise.all([
      prisma.organization.findUnique({ where: { id: resolvedProviderOrgId } }),
      prisma.organization.findUnique({ where: { id: resolvedRecipientOrgId } }),
    ]);

    const industryOrgId =
      provOrg?.type === "INDUSTRY"
        ? provOrg.id
        : recipOrg?.type === "INDUSTRY"
        ? recipOrg.id
        : resolvedProviderOrgId;

    let parsedDate: Date | null = null;
    if (expectedCompletionDate) {
      const d = new Date(expectedCompletionDate);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }

    const collaboration = await prisma.collaboration.create({
      data: {
        needId: needId || null,
        offerId: offerId || null,
        providerOrgId: resolvedProviderOrgId,
        recipientOrgId: resolvedRecipientOrgId,
        projectId: need?.projectId || null,
        problemId: primaryProblemId,
        industryId: industryOrgId,
        contributionScope,
        expectedCompletionDate: parsedDate,
        status: CollaborationStatus.PROPOSED,
        message: contributionScope,
      },
      include: {
        providerOrg: {
          select: { id: true, name: true, type: true, district: true },
        },
        recipientOrg: {
          select: { id: true, name: true, type: true, district: true },
        },
        need: {
          select: { id: true, title: true, category: true, urgency: true },
        },
        offer: {
          select: { id: true, title: true, category: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Collaboration proposal submitted successfully.",
      collaboration,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to initiate collaboration.",
      details: error.message,
    });
  }
});

/**
 * GET /api/collaborations
 * List collaborations involving the user's organization (or all if ADMIN).
 */
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userOrgId = req.user?.organizationId;

    if (!userOrgId || userRole === Role.CITIZEN) {
      res.status(403).json({
        success: false,
        error: "Forbidden: Citizen accounts cannot access institutional collaborations.",
      });
      return;
    }

    const { status, projectId, needId, offerId, role } = req.query;

    const where: any = {};

    // Organization filtering
    if (userRole !== Role.ADMIN) {
      if (role === "provider") {
        where.providerOrgId = userOrgId;
      } else if (role === "recipient") {
        where.recipientOrgId = userOrgId;
      } else {
        where.OR = [
          { providerOrgId: userOrgId },
          { recipientOrgId: userOrgId },
        ];
      }
    }

    if (status && Object.values(CollaborationStatus).includes(status as CollaborationStatus)) {
      where.status = status as CollaborationStatus;
    }
    if (projectId && typeof projectId === "string") {
      where.projectId = projectId;
    }
    if (needId && typeof needId === "string") {
      where.needId = needId;
    }
    if (offerId && typeof offerId === "string") {
      where.offerId = offerId;
    }

    const collaborations = await prisma.collaboration.findMany({
      where,
      include: {
        providerOrg: {
          select: { id: true, name: true, type: true, district: true },
        },
        recipientOrg: {
          select: { id: true, name: true, type: true, district: true },
        },
        need: {
          select: { id: true, title: true, category: true, urgency: true, status: true },
        },
        offer: {
          select: { id: true, title: true, category: true, district: true },
        },
        project: {
          select: { id: true, title: true, trackType: true, status: true },
        },
        _count: {
          select: {
            milestones: true,
            progressUpdates: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      count: collaborations.length,
      collaborations,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to list collaborations.",
      details: error.message,
    });
  }
});

/**
 * GET /api/collaborations/:id
 * Retrieve full collaboration dossier.
 */
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userOrgId = req.user?.organizationId;

    const collaboration = await prisma.collaboration.findUnique({
      where: { id },
      include: {
        providerOrg: true,
        recipientOrg: true,
        need: {
          include: {
            creatorOrg: true,
          },
        },
        offer: {
          include: {
            providerOrg: true,
          },
        },
        project: {
          include: {
            leadOrg: true,
            problems: {
              include: {
                problem: true,
              },
            },
          },
        },
        milestones: {
          orderBy: { targetDate: "asc" },
        },
        progressUpdates: {
          include: {
            postedBy: {
              select: { id: true, name: true, role: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!collaboration) {
      res.status(404).json({ success: false, error: "Collaboration not found." });
      return;
    }

    // Access check
    if (
      userRole !== Role.ADMIN &&
      collaboration.providerOrgId !== userOrgId &&
      collaboration.recipientOrgId !== userOrgId
    ) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only view collaborations involving your organization.",
      });
      return;
    }

    res.json({
      success: true,
      collaboration,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve collaboration dossier.",
      details: error.message,
    });
  }
});

/**
 * POST /api/collaborations/:id/accept
 * Accept a proposed collaboration commitment.
 * RBAC: The counterpart organization (or Admin).
 */
router.post("/:id/accept", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userOrgId = req.user?.organizationId;
    const isAdmin = req.user?.role === Role.ADMIN;

    const collab = await prisma.collaboration.findUnique({
      where: { id },
      include: { need: true },
    });

    if (!collab) {
      res.status(404).json({ success: false, error: "Collaboration not found." });
      return;
    }

    if (collab.status !== CollaborationStatus.PROPOSED) {
      res.status(400).json({
        success: false,
        error: `Cannot accept collaboration in state '${collab.status}'. Must be PROPOSED.`,
      });
      return;
    }

    // Must be either providerOrg or recipientOrg (whichever counterpart received the proposal)
    const isAuthorized =
      isAdmin ||
      collab.providerOrgId === userOrgId ||
      collab.recipientOrgId === userOrgId;

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        error: "Access denied. You do not belong to an organization participating in this collaboration.",
      });
      return;
    }

    const updated = await prisma.$transaction(async (tx: Omit<PrismaClient<any, any, DefaultArgs>, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
      const c = await tx.collaboration.update({
        where: { id },
        data: { status: CollaborationStatus.ACCEPTED },
      });

      if (collab.needId) {
        await tx.need.update({
          where: { id: collab.needId },
          data: { status: NeedStatus.COMMITTED },
        });
      }

      return c;
    });

    res.json({
      success: true,
      message: "Collaboration proposal accepted successfully.",
      collaboration: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to accept collaboration.",
      details: error.message,
    });
  }
});

/**
 * POST /api/collaborations/:id/decline and /api/collaborations/:id/reject
 * Decline a proposed collaboration commitment.
 */
router.post(["/:id/decline", "/:id/reject"], authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userOrgId = req.user?.organizationId;
    const isAdmin = req.user?.role === Role.ADMIN;

    const collab = await prisma.collaboration.findUnique({ where: { id } });
    if (!collab) {
      res.status(404).json({ success: false, error: "Collaboration not found." });
      return;
    }

    if (collab.status !== CollaborationStatus.PROPOSED) {
      res.status(400).json({
        success: false,
        error: `Cannot decline collaboration in state '${collab.status}'. Must be PROPOSED.`,
      });
      return;
    }

    if (
      !isAdmin &&
      collab.providerOrgId !== userOrgId &&
      collab.recipientOrgId !== userOrgId
    ) {
      res.status(403).json({
        success: false,
        error: "Access denied.",
      });
      return;
    }

    const parseResult = notesSchema.safeParse(req.body);
    const notes = parseResult.success ? (parseResult.data.notes || parseResult.data.reason) : null;

    const updated = await prisma.collaboration.update({
      where: { id },
      data: {
        status: CollaborationStatus.DECLINED,
        completionNotes: notes ? `Declined reason: ${notes}` : "Declined by counterpart organization.",
      },
    });

    res.json({
      success: true,
      message: "Collaboration declined.",
      collaboration: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to decline collaboration.",
      details: error.message,
    });
  }
});

/**
 * POST /api/collaborations/:id/start
 * Transition collaboration status to IN_PROGRESS.
 */
router.post("/:id/start", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userOrgId = req.user?.organizationId;
    const isAdmin = req.user?.role === Role.ADMIN;

    const collab = await prisma.collaboration.findUnique({ where: { id } });
    if (!collab) {
      res.status(404).json({ success: false, error: "Collaboration not found." });
      return;
    }

    if (collab.status !== CollaborationStatus.ACCEPTED) {
      res.status(400).json({
        success: false,
        error: `Cannot start collaboration in state '${collab.status}'. Must be ACCEPTED first.`,
      });
      return;
    }

    if (
      !isAdmin &&
      collab.providerOrgId !== userOrgId &&
      collab.recipientOrgId !== userOrgId
    ) {
      res.status(403).json({ success: false, error: "Access denied." });
      return;
    }

    const updated = await prisma.collaboration.update({
      where: { id },
      data: { status: CollaborationStatus.IN_PROGRESS },
    });

    res.json({
      success: true,
      message: "Collaboration is now in progress.",
      collaboration: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to start collaboration.",
      details: error.message,
    });
  }
});

/**
 * POST /api/collaborations/:id/deliver
 * Provider organization submits proof of deliverable.
 */
router.post("/:id/deliver", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userOrgId = req.user?.organizationId;
    const isAdmin = req.user?.role === Role.ADMIN;

    const collab = await prisma.collaboration.findUnique({ where: { id } });
    if (!collab) {
      res.status(404).json({ success: false, error: "Collaboration not found." });
      return;
    }

    if (
      collab.status !== CollaborationStatus.IN_PROGRESS &&
      collab.status !== CollaborationStatus.ACCEPTED
    ) {
      res.status(400).json({
        success: false,
        error: `Cannot deliver collaboration in state '${collab.status}'. Must be IN_PROGRESS or ACCEPTED.`,
      });
      return;
    }

    // Only providerOrg (or Admin) can submit the deliverable
    if (!isAdmin && collab.providerOrgId !== userOrgId) {
      res.status(403).json({
        success: false,
        error: "Access denied. Only the provider organization can deliver commitments.",
      });
      return;
    }

    const parseResult = deliverCollaborationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { proofDocumentUrl, completionNotes } = parseResult.data;

    const updated = await prisma.collaboration.update({
      where: { id },
      data: {
        status: CollaborationStatus.DELIVERED,
        proofDocumentUrl,
        completionNotes,
      },
    });

    res.json({
      success: true,
      message: "Deliverable submitted successfully.",
      collaboration: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to submit deliverable.",
      details: error.message,
    });
  }
});

/**
 * POST /api/collaborations/:id/confirm and /api/collaborations/:id/complete
 * Recipient organization confirms deliverable receipt and satisfaction.
 */
router.post(["/:id/confirm", "/:id/complete"], authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userOrgId = req.user?.organizationId;
    const isAdmin = req.user?.role === Role.ADMIN;

    const collab = await prisma.collaboration.findUnique({
      where: { id },
      include: { need: true },
    });

    if (!collab) {
      res.status(404).json({ success: false, error: "Collaboration not found." });
      return;
    }

    const eligibleStatuses: CollaborationStatus[] = [
      CollaborationStatus.DELIVERED,
      CollaborationStatus.IN_PROGRESS,
      CollaborationStatus.ACCEPTED,
    ];

    if (!eligibleStatuses.includes(collab.status)) {
      res.status(400).json({
        success: false,
        error: `Cannot complete or confirm collaboration in state '${collab.status}'. Must be active or delivered.`,
      });
      return;
    }

    // Must belong to recipientOrg, providerOrg, or Admin
    const isParticipant =
      isAdmin ||
      collab.recipientOrgId === userOrgId ||
      collab.providerOrgId === userOrgId;

    if (!isParticipant) {
      res.status(403).json({
        success: false,
        error: "Access denied. Only participating organizations or admins can confirm completion.",
      });
      return;
    }

    const updated = await prisma.$transaction(async (tx: Omit<PrismaClient<any, any, DefaultArgs>, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
      const c = await tx.collaboration.update({
        where: { id },
        data: {
          status: CollaborationStatus.CONFIRMED,
          completedAt: new Date(),
        },
      });

      // Mark need as fulfilled
      if (collab.needId) {
        await tx.need.update({
          where: { id: collab.needId },
          data: { status: NeedStatus.FULFILLED },
        });
      }

      return c;
    });

    res.json({
      success: true,
      message: "Collaboration confirmed and successfully completed.",
      collaboration: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to confirm collaboration.",
      details: error.message,
    });
  }
});

/**
 * POST /api/collaborations/:id/cancel
 * Cancel a collaboration prior to completion.
 */
router.post("/:id/cancel", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userOrgId = req.user?.organizationId;
    const isAdmin = req.user?.role === Role.ADMIN;

    const collab = await prisma.collaboration.findUnique({ where: { id } });
    if (!collab) {
      res.status(404).json({ success: false, error: "Collaboration not found." });
      return;
    }

    if (
      collab.status === CollaborationStatus.DELIVERED ||
      collab.status === CollaborationStatus.CONFIRMED ||
      collab.status === CollaborationStatus.CANCELLED
    ) {
      res.status(400).json({
        success: false,
        error: `Cannot cancel collaboration in state '${collab.status}'.`,
      });
      return;
    }

    if (
      !isAdmin &&
      collab.providerOrgId !== userOrgId &&
      collab.recipientOrgId !== userOrgId
    ) {
      res.status(403).json({ success: false, error: "Access denied." });
      return;
    }

    const parseResult = notesSchema.safeParse(req.body);
    const notes = parseResult.success ? parseResult.data.notes : null;

    const updated = await prisma.$transaction(async (tx: Omit<PrismaClient<any, any, DefaultArgs>, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
      const c = await tx.collaboration.update({
        where: { id },
        data: {
          status: CollaborationStatus.CANCELLED,
          completionNotes: notes ? `Cancelled reason: ${notes}` : "Cancelled by participant.",
        },
      });

      // Check if need has other active collaborations
      if (collab.needId) {
        const otherActive = await tx.collaboration.findFirst({
          where: {
            needId: collab.needId,
            id: { not: id },
            status: {
              in: [
                CollaborationStatus.PROPOSED,
                CollaborationStatus.ACCEPTED,
                CollaborationStatus.IN_PROGRESS,
              ],
            },
          },
        });

        if (!otherActive) {
          await tx.need.update({
            where: { id: collab.needId },
            data: { status: NeedStatus.OPEN },
          });
        }
      }

      return c;
    });

    res.json({
      success: true,
      message: "Collaboration cancelled successfully.",
      collaboration: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to cancel collaboration.",
      details: error.message,
    });
  }
});

export default router;
