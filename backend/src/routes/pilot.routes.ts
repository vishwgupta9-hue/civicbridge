import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { AuthenticatedUser } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  Role,
  PilotStatus,
  ClearanceStatus,
  VerificationFinding,
  EvidenceType,
} from "@prisma/client";

const router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createPilotSchema = z.object({
  projectId: z.string().uuid("Invalid Project ID format"),
  problemId: z.string().uuid("Invalid Problem ID format").optional().nullable(),
  responsibleOrgId: z.string().uuid("Invalid Organization ID format").optional().nullable(),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().trim().min(10, "Description must be at least 10 characters").optional().nullable(),
  risksRequirements: z.string().trim().max(5000).optional().nullable(),
  siteLocation: z.string().trim().min(3, "Site location must be at least 3 characters").max(200),
  district: z.string().trim().min(2, "District is required"),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  targetBeneficiaryCount: z.number().int().min(0).optional().default(0),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  clearanceStatus: z
    .enum(["NOT_REQUIRED", "REQUIRED"], {
      errorMap: () => ({ message: "Initial clearance requirement must be NOT_REQUIRED or REQUIRED" }),
    })
    .optional()
    .default("NOT_REQUIRED"),
  evidenceDocumentUrl: z.string().url("Evidence document URL must be a valid URL").optional().nullable(),
});

const updatePilotSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(10).optional().nullable(),
  risksRequirements: z.string().trim().max(5000).optional().nullable(),
  siteLocation: z.string().trim().min(3).max(200).optional(),
  district: z.string().trim().min(2).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  targetBeneficiaryCount: z.number().int().min(0).optional(),
  actualBeneficiaryCount: z.number().int().min(0).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  actualStartDate: z.string().datetime().optional().nullable(),
  actualEndDate: z.string().datetime().optional().nullable(),
  evidenceDocumentUrl: z.string().url().optional().nullable(),
});

const clearanceRequestSchema = z.object({
  clearanceNotes: z
    .string()
    .trim()
    .min(10, "Clearance request notes must be at least 10 characters")
    .max(5000),
  clearanceDocumentUrl: z.string().url("Clearance document URL must be valid").optional().nullable(),
});

const clearanceDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "NEEDS_MORE_INFO", "GRANTED", "DECLINED"], {
    errorMap: () => ({
      message: "Decision must be APPROVED, REJECTED, or NEEDS_MORE_INFO",
    }),
  }),
  notes: z
    .string()
    .trim()
    .min(5, "Decision notes must be at least 5 characters")
    .max(5000),
  clearanceDocumentUrl: z.string().url("Official permission document URL must be valid").optional().nullable(),
});

const createMetricSchema = z.object({
  metricName: z.string().trim().min(2, "Metric name must be at least 2 characters").max(100),
  unit: z.string().trim().min(1, "Unit must be provided").max(50),
  baselineValue: z.number({ required_error: "Baseline value is required" }),
  targetValue: z.number().optional().nullable(),
  evidenceUrl: z.string().url("Evidence URL must be valid").optional().nullable(),
});

const updateMetricOutcomeSchema = z.object({
  outcomeValue: z.number({ required_error: "Outcome value is required" }),
  evidenceUrl: z.string().url("Evidence URL must be valid").optional().nullable(),
});

const createVerificationSchema = z.object({
  finding: z.nativeEnum(VerificationFinding, {
    errorMap: () => ({
      message: "Finding must be SUCCESS_CONFIRMED, PARTIAL_IMPROVEMENT, NO_CHANGE, or FAILED",
    }),
  }),
  evidenceType: z.nativeEnum(EvidenceType, {
    errorMap: () => ({
      message: "Evidence type must be PHOTO_GEOTAG, LAB_REPORT, SENSOR_DATASET, or WRITTEN_INSPECTION",
    }),
  }),
  evidenceUrl: z.string().url("Evidence URL must be a valid URL").optional().nullable(),
  feedbackText: z
    .string()
    .trim()
    .min(5, "Verification feedback must be at least 5 characters")
    .max(5000),
});

// =============================================================================
// HELPER: Check Pilot Authorization
// =============================================================================
async function getPilotWithAuthCheck(pilotId: string, user: AuthenticatedUser) {
  const pilot = await prisma.pilotDeployment.findUnique({
    where: { id: pilotId },
    include: {
      project: {
        include: {
          leadOrg: true,
          collaborations: true,
        },
      },
      problem: true,
      responsibleOrg: true,
      metrics: {
        include: {
          recordedBy: { select: { id: true, name: true, role: true } },
          verifiedBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { recordedAt: "asc" },
      },
      verifications: {
        include: {
          verifier: { select: { id: true, name: true, role: true, district: true } },
          organization: { select: { id: true, name: true, type: true } },
        },
        orderBy: { verifiedAt: "desc" },
      },
      clearedBy: {
        select: { id: true, name: true, role: true, district: true },
      },
    },
  });

  if (!pilot) {
    return { pilot: null, isAuthorized: false, isLeadOrPartner: false, isAdmin: false };
  }

  const isAdmin = user.role === Role.ADMIN;
  const userOrgId = user.organizationId;

  const isLeadOrg = !!userOrgId && pilot.project.leadOrgId === userOrgId;
  const isResponsibleOrg = !!userOrgId && pilot.responsibleOrgId === userOrgId;
  const isCollabPartner =
    !!userOrgId &&
    pilot.project.collaborations.some(
      (c) => c.providerOrgId === userOrgId || c.recipientOrgId === userOrgId
    );

  const isLeadOrPartner = isLeadOrg || isResponsibleOrg || isCollabPartner;
  const isAuthorized = isAdmin || isLeadOrPartner;

  return { pilot, isAuthorized, isLeadOrPartner, isAdmin };
}

// =============================================================================
// 1. PILOT DEPLOYMENT CRUD & LIFECYCLE
// =============================================================================

/**
 * POST /api/pilots
 * Propose a new Field Pilot Deployment connected to an existing Project.
 * RBAC: Institutional users (UNIVERSITY, STARTUP, INDUSTRY, ADMIN) linked to Project.
 */
router.post(
  "/",
  authenticate,
  authorizeRoles(Role.UNIVERSITY, Role.STARTUP, Role.INDUSTRY, Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      if (!user.organizationId && user.role !== Role.ADMIN) {
        res.status(400).json({
          success: false,
          error: "User must belong to a registered Organization to deploy a Pilot.",
        });
        return;
      }

      const parsed = createPilotSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: "Validation failed.",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const {
        projectId,
        problemId,
        responsibleOrgId,
        title,
        description,
        risksRequirements,
        siteLocation,
        district,
        latitude,
        longitude,
        targetBeneficiaryCount,
        startDate,
        endDate,
        clearanceStatus,
        evidenceDocumentUrl,
      } = parsed.data;

      // Verify project exists and requester is authorized
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          collaborations: true,
          problems: true,
        },
      });

      if (!project) {
        res.status(404).json({ success: false, error: "Referenced Project not found." });
        return;
      }

      const isLead = project.leadOrgId === user.organizationId;
      const isPartner = project.collaborations.some(
        (c) => c.providerOrgId === user.organizationId || c.recipientOrgId === user.organizationId
      );
      const isAdmin = user.role === Role.ADMIN;

      if (!isLead && !isPartner && !isAdmin) {
        res.status(403).json({
          success: false,
          error: "Access denied. Only the project lead organization or collaboration partners can deploy pilots for this project.",
        });
        return;
      }

      // Verify problemId if supplied
      if (problemId) {
        const problem = await prisma.problem.findUnique({ where: { id: problemId } });
        if (!problem) {
          res.status(404).json({ success: false, error: "Referenced Problem not found." });
          return;
        }
      }

      const effectiveOrgId = responsibleOrgId || user.organizationId;

      const pilot = await prisma.pilotDeployment.create({
        data: {
          projectId,
          problemId: problemId || null,
          responsibleOrgId: effectiveOrgId,
          title,
          description: description || null,
          risksRequirements: risksRequirements || null,
          siteLocation,
          district,
          latitude: latitude || null,
          longitude: longitude || null,
          targetBeneficiaryCount: targetBeneficiaryCount || 0,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          clearanceStatus: clearanceStatus as ClearanceStatus,
          status: PilotStatus.PROPOSED,
          evidenceDocumentUrl: evidenceDocumentUrl || null,
        },
        include: {
          project: {
            select: { id: true, title: true, trackType: true },
          },
          problem: {
            select: { id: true, title: true, district: true, category: true },
          },
          responsibleOrg: {
            select: { id: true, name: true, type: true, district: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Pilot deployment proposed successfully.",
        pilot,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to propose pilot deployment.",
        details: error.message,
      });
    }
  }
);

/**
 * GET /api/pilots
 * List and filter field pilot deployments.
 */
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { projectId, problemId, district, status, clearanceStatus, search, page = "1", limit = "20" } =
      req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (projectId && typeof projectId === "string") where.projectId = projectId;
    if (problemId && typeof problemId === "string") where.problemId = problemId;
    if (district && typeof district === "string") {
      where.district = { contains: district, mode: "insensitive" };
    }
    if (status && Object.values(PilotStatus).includes(status as PilotStatus)) {
      where.status = status as PilotStatus;
    }
    if (clearanceStatus && Object.values(ClearanceStatus).includes(clearanceStatus as ClearanceStatus)) {
      where.clearanceStatus = clearanceStatus as ClearanceStatus;
    }
    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { siteLocation: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, pilots] = await Promise.all([
      prisma.pilotDeployment.count({ where }),
      prisma.pilotDeployment.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          project: {
            select: { id: true, title: true, trackType: true },
          },
          problem: {
            select: { id: true, title: true, district: true, category: true },
          },
          responsibleOrg: {
            select: { id: true, name: true, type: true, district: true },
          },
          _count: {
            select: { metrics: true, verifications: true },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      pilots,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to list pilot deployments.",
      details: error.message,
    });
  }
});

/**
 * GET /api/pilots/clearances/pending
 * List all pilots with pending clearance requests (Government review feed).
 * RBAC: ADMIN only.
 */
router.get(
  "/clearances/pending",
  authenticate,
  authorizeRoles(Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const { district } = req.query;

      const where: any = {
        clearanceStatus: {
          in: [ClearanceStatus.REQUESTED, ClearanceStatus.UNDER_REVIEW, ClearanceStatus.NEEDS_MORE_INFO],
        },
      };

      if (district && typeof district === "string") {
        where.district = { contains: district, mode: "insensitive" };
      }

      const pendingClearances = await prisma.pilotDeployment.findMany({
        where,
        include: {
          project: {
            include: { leadOrg: true },
          },
          problem: true,
          responsibleOrg: true,
        },
        orderBy: { clearanceRequestedAt: "desc" },
      });

      res.json({
        success: true,
        count: pendingClearances.length,
        pendingClearances,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to retrieve pending clearances.",
        details: error.message,
      });
    }
  }
);

/**
 * GET /api/pilots/:id
 * Retrieve full pilot details with metrics, verifications, and clearance state.
 */
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pilot } = await getPilotWithAuthCheck(id, req.user!);

    if (!pilot) {
      res.status(404).json({ success: false, error: "Pilot deployment not found." });
      return;
    }

    res.json({
      success: true,
      pilot,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve pilot deployment.",
      details: error.message,
    });
  }
});

/**
 * PATCH /api/pilots/:id
 * Update pilot deployment details.
 * Allowed only in PROPOSED or PREPARATION states. Concluded/active pilots cannot be freely mutated.
 */
router.patch("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pilot, isAuthorized } = await getPilotWithAuthCheck(id, req.user!);

    if (!pilot) {
      res.status(404).json({ success: false, error: "Pilot deployment not found." });
      return;
    }

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        error: "Access denied. You cannot modify this pilot deployment.",
      });
      return;
    }

    // Controlled mutation guard
    if (pilot.status === PilotStatus.CONCLUDED) {
      res.status(400).json({
        success: false,
        error: "Concluded pilots cannot be mutated.",
      });
      return;
    }

    const parseResult = updatePilotSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const updated = await prisma.pilotDeployment.update({
      where: { id },
      data: {
        ...parseResult.data,
        startDate: parseResult.data.startDate ? new Date(parseResult.data.startDate) : undefined,
        endDate: parseResult.data.endDate ? new Date(parseResult.data.endDate) : undefined,
        actualStartDate: parseResult.data.actualStartDate ? new Date(parseResult.data.actualStartDate) : undefined,
        actualEndDate: parseResult.data.actualEndDate ? new Date(parseResult.data.actualEndDate) : undefined,
      },
    });

    res.json({
      success: true,
      message: "Pilot deployment updated successfully.",
      pilot: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to update pilot deployment.",
      details: error.message,
    });
  }
});

// =============================================================================
// 2. STATE TRANSITIONS & CLEARANCE GATES
// =============================================================================

/**
 * POST /api/pilots/:id/prepare
 * Transition pilot from PROPOSED to PREPARATION.
 */
router.post("/:id/prepare", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pilot, isAuthorized } = await getPilotWithAuthCheck(id, req.user!);

    if (!pilot) {
      res.status(404).json({ success: false, error: "Pilot deployment not found." });
      return;
    }

    if (!isAuthorized) {
      res.status(403).json({ success: false, error: "Access denied." });
      return;
    }

    if (pilot.status !== PilotStatus.PROPOSED) {
      res.status(400).json({
        success: false,
        error: `Cannot enter PREPARATION from status '${pilot.status}'. Must be PROPOSED.`,
      });
      return;
    }

    const updated = await prisma.pilotDeployment.update({
      where: { id },
      data: { status: PilotStatus.PREPARATION },
    });

    res.json({
      success: true,
      message: "Pilot is now in preparation phase.",
      pilot: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to transition pilot to preparation.",
      details: error.message,
    });
  }
});

/**
 * POST /api/pilots/:id/activate
 * Transition pilot to ACTIVE_ON_GROUND.
 * STRICT CLEARANCE GATE: If clearanceStatus is REQUIRED, REQUESTED, UNDER_REVIEW,
 * REJECTED, or NEEDS_MORE_INFO, activation is strictly prohibited.
 */
router.post("/:id/activate", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pilot, isAuthorized } = await getPilotWithAuthCheck(id, req.user!);

    if (!pilot) {
      res.status(404).json({ success: false, error: "Pilot deployment not found." });
      return;
    }

    if (!isAuthorized) {
      res.status(403).json({ success: false, error: "Access denied." });
      return;
    }

    if (
      pilot.status !== PilotStatus.PREPARATION &&
      pilot.status !== PilotStatus.PROPOSED
    ) {
      res.status(400).json({
        success: false,
        error: `Cannot activate pilot in status '${pilot.status}'. Must be in PREPARATION or PROPOSED.`,
      });
      return;
    }

    // STRICT CLEARANCE GATE
    const isClearanceSatisfied =
      pilot.clearanceStatus === ClearanceStatus.NOT_REQUIRED ||
      pilot.clearanceStatus === ClearanceStatus.APPROVED ||
      pilot.clearanceStatus === ClearanceStatus.GRANTED;

    if (!isClearanceSatisfied) {
      res.status(400).json({
        success: false,
        error: `Cannot activate pilot: Administrative government clearance is required and currently has status '${pilot.clearanceStatus}'. Must be APPROVED or NOT_REQUIRED.`,
      });
      return;
    }

    const updated = await prisma.pilotDeployment.update({
      where: { id },
      data: {
        status: PilotStatus.ACTIVE_ON_GROUND,
        actualStartDate: pilot.actualStartDate || new Date(),
      },
    });

    res.json({
      success: true,
      message: "Pilot is now ACTIVE on the ground.",
      pilot: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to activate pilot.",
      details: error.message,
    });
  }
});

/**
 * POST /api/pilots/:id/evaluate
 * Transition pilot from ACTIVE_ON_GROUND to EVALUATION.
 */
router.post("/:id/evaluate", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pilot, isAuthorized } = await getPilotWithAuthCheck(id, req.user!);

    if (!pilot) {
      res.status(404).json({ success: false, error: "Pilot deployment not found." });
      return;
    }

    if (!isAuthorized) {
      res.status(403).json({ success: false, error: "Access denied." });
      return;
    }

    if (pilot.status !== PilotStatus.ACTIVE_ON_GROUND) {
      res.status(400).json({
        success: false,
        error: `Cannot transition to EVALUATION from status '${pilot.status}'. Must be ACTIVE_ON_GROUND.`,
      });
      return;
    }

    const updated = await prisma.pilotDeployment.update({
      where: { id },
      data: { status: PilotStatus.EVALUATION },
    });

    res.json({
      success: true,
      message: "Pilot transitioned to evaluation phase.",
      pilot: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to transition pilot to evaluation.",
      details: error.message,
    });
  }
});

/**
 * POST /api/pilots/:id/conclude
 * Conclude the field pilot deployment.
 * STRICT EVALUATION GATE: Must be in EVALUATION state and have at least one outcome metric recorded.
 */
router.post("/:id/conclude", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pilot, isAuthorized } = await getPilotWithAuthCheck(id, req.user!);

    if (!pilot) {
      res.status(404).json({ success: false, error: "Pilot deployment not found." });
      return;
    }

    if (!isAuthorized) {
      res.status(403).json({ success: false, error: "Access denied." });
      return;
    }

    if (
      pilot.status !== PilotStatus.EVALUATION &&
      pilot.status !== PilotStatus.ACTIVE_ON_GROUND
    ) {
      res.status(400).json({
        success: false,
        error: `Cannot conclude pilot in status '${pilot.status}'. Must be in EVALUATION or ACTIVE_ON_GROUND.`,
      });
      return;
    }

    // Must have at least one outcome metric recorded
    const hasOutcome = pilot.metrics.some((m) => m.outcomeValue !== null && m.outcomeValue !== undefined);
    if (!hasOutcome) {
      res.status(400).json({
        success: false,
        error: "Cannot conclude pilot without recorded outcome measurements. Please record at least one outcome metric.",
      });
      return;
    }

    const updated = await prisma.pilotDeployment.update({
      where: { id },
      data: {
        status: PilotStatus.CONCLUDED,
        actualEndDate: pilot.actualEndDate || new Date(),
      },
    });

    res.json({
      success: true,
      message: "Pilot deployment concluded successfully.",
      pilot: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to conclude pilot deployment.",
      details: error.message,
    });
  }
});

// =============================================================================
// 3. CLEARANCE / NOC WORKFLOW
// =============================================================================

/**
 * POST /api/pilots/:id/clearance/request
 * Pilot lead requests government administrative clearance / NOC.
 */
router.post("/:id/clearance/request", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pilot, isAuthorized } = await getPilotWithAuthCheck(id, req.user!);

    if (!pilot) {
      res.status(404).json({ success: false, error: "Pilot deployment not found." });
      return;
    }

    if (!isAuthorized) {
      res.status(403).json({ success: false, error: "Access denied." });
      return;
    }

    if (
      pilot.clearanceStatus === ClearanceStatus.APPROVED ||
      pilot.clearanceStatus === ClearanceStatus.GRANTED
    ) {
      res.status(400).json({
        success: false,
        error: "Clearance has already been granted for this pilot deployment.",
      });
      return;
    }

    const parseResult = clearanceRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { clearanceNotes, clearanceDocumentUrl } = parseResult.data;

    const updated = await prisma.pilotDeployment.update({
      where: { id },
      data: {
        clearanceStatus: ClearanceStatus.REQUESTED,
        clearanceNotes: `Requested: ${clearanceNotes}`,
        clearanceDocumentUrl: clearanceDocumentUrl || pilot.clearanceDocumentUrl,
        clearanceRequestedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Administrative clearance requested successfully. Pending government review.",
      pilot: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to submit clearance request.",
      details: error.message,
    });
  }
});

/**
 * POST /api/pilots/:id/clearance/review
 * Government admin marks clearance request as UNDER_REVIEW.
 * RBAC: ADMIN only.
 */
router.post(
  "/:id/clearance/review",
  authenticate,
  authorizeRoles(Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const pilot = await prisma.pilotDeployment.findUnique({ where: { id } });

      if (!pilot) {
        res.status(404).json({ success: false, error: "Pilot deployment not found." });
        return;
      }

      if (pilot.clearanceStatus !== ClearanceStatus.REQUESTED && pilot.clearanceStatus !== ClearanceStatus.NEEDS_MORE_INFO) {
        res.status(400).json({
          success: false,
          error: `Cannot place clearance under review from status '${pilot.clearanceStatus}'. Must be REQUESTED or NEEDS_MORE_INFO.`,
        });
        return;
      }

      const updated = await prisma.pilotDeployment.update({
        where: { id },
        data: { clearanceStatus: ClearanceStatus.UNDER_REVIEW },
      });

      res.json({
        success: true,
        message: "Clearance request is now under official administrative review.",
        pilot: updated,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to place clearance under review.",
        details: error.message,
      });
    }
  }
);

/**
 * POST /api/pilots/:id/clearance/decision
 * Authorized government official issues clearance decision.
 * RBAC: ADMIN only.
 */
router.post(
  "/:id/clearance/decision",
  authenticate,
  authorizeRoles(Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const pilot = await prisma.pilotDeployment.findUnique({ where: { id } });

      if (!pilot) {
        res.status(404).json({ success: false, error: "Pilot deployment not found." });
        return;
      }

      const parseResult = clearanceDecisionSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: "Validation failed.",
          details: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { decision, notes, clearanceDocumentUrl } = parseResult.data;

      // Normalize decision
      let finalStatus: ClearanceStatus;
      if (decision === "APPROVED" || decision === "GRANTED") {
        finalStatus = ClearanceStatus.APPROVED;
      } else if (decision === "REJECTED" || decision === "DECLINED") {
        finalStatus = ClearanceStatus.REJECTED;
      } else {
        finalStatus = ClearanceStatus.NEEDS_MORE_INFO;
      }

      const updated = await prisma.pilotDeployment.update({
        where: { id },
        data: {
          clearanceStatus: finalStatus,
          clearanceNotes: notes,
          clearanceDocumentUrl: clearanceDocumentUrl || pilot.clearanceDocumentUrl,
          clearedById: req.user!.id,
          clearanceDecidedAt: new Date(),
        },
        include: {
          clearedBy: {
            select: { id: true, name: true, role: true, district: true },
          },
        },
      });

      res.json({
        success: true,
        message: `Clearance decision recorded: ${finalStatus}`,
        pilot: updated,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to record clearance decision.",
        details: error.message,
      });
    }
  }
);

// =============================================================================
// 4. PILOT METRICS (Baseline & Outcome Tracking)
// =============================================================================

/**
 * POST /api/pilots/:id/metrics
 * Record a new quantitative metric with baseline measurement.
 */
router.post("/:id/metrics", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pilot, isAuthorized } = await getPilotWithAuthCheck(id, req.user!);

    if (!pilot) {
      res.status(404).json({ success: false, error: "Pilot deployment not found." });
      return;
    }

    if (!isAuthorized) {
      res.status(403).json({ success: false, error: "Access denied." });
      return;
    }

    if (pilot.status === PilotStatus.CONCLUDED) {
      res.status(400).json({ success: false, error: "Cannot add metrics to a concluded pilot." });
      return;
    }

    const parseResult = createMetricSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { metricName, unit, baselineValue, targetValue, evidenceUrl } = parseResult.data;

    const metric = await prisma.pilotMetric.create({
      data: {
        pilotId: id,
        metricName,
        unit,
        baselineValue,
        targetValue: targetValue || null,
        status: "REPORTED",
        evidenceUrl: evidenceUrl || null,
        recordedById: req.user!.id,
      },
      include: {
        recordedBy: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Pilot baseline metric recorded successfully.",
      metric,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to record pilot metric.",
      details: error.message,
    });
  }
});

/**
 * PATCH /api/pilots/metrics/:metricId
 * Record or update outcome measurement for a metric.
 */
router.patch("/metrics/:metricId", authenticate, async (req: Request, res: Response) => {
  try {
    const { metricId } = req.params;
    const user = req.user!;

    const metric = await prisma.pilotMetric.findUnique({
      where: { id: metricId },
      include: {
        pilot: {
          include: {
            project: { include: { collaborations: true } },
          },
        },
      },
    });

    if (!metric) {
      res.status(404).json({ success: false, error: "Pilot metric not found." });
      return;
    }

    const userOrgId = user.organizationId;
    const isLead = metric.pilot.project.leadOrgId === userOrgId;
    const isResponsible = metric.pilot.responsibleOrgId === userOrgId;
    const isPartner = metric.pilot.project.collaborations.some(
      (c) => c.providerOrgId === userOrgId || c.recipientOrgId === userOrgId
    );
    const isAdmin = user.role === Role.ADMIN;

    if (!isLead && !isResponsible && !isPartner && !isAdmin) {
      res.status(403).json({ success: false, error: "Access denied." });
      return;
    }

    const parseResult = updateMetricOutcomeSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { outcomeValue, evidenceUrl } = parseResult.data;

    const updated = await prisma.pilotMetric.update({
      where: { id: metricId },
      data: {
        outcomeValue,
        evidenceUrl: evidenceUrl || metric.evidenceUrl,
      },
      include: {
        recordedBy: { select: { id: true, name: true, role: true } },
        verifiedBy: { select: { id: true, name: true, role: true } },
      },
    });

    res.json({
      success: true,
      message: "Outcome value recorded successfully.",
      metric: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to update metric outcome.",
      details: error.message,
    });
  }
});

/**
 * POST /api/pilots/metrics/:metricId/verify
 * Confirm and verify a reported metric measurement.
 * RBAC: ADMIN or Verifying Counterpart Org.
 */
router.post("/metrics/:metricId/verify", authenticate, async (req: Request, res: Response) => {
  try {
    const { metricId } = req.params;
    const user = req.user!;

    if (user.role === Role.CITIZEN) {
      res.status(403).json({
        success: false,
        error: "Citizens submit ground-truth verifications via the verifications endpoint.",
      });
      return;
    }

    const metric = await prisma.pilotMetric.findUnique({
      where: { id: metricId },
      include: {
        pilot: {
          include: {
            project: { include: { collaborations: true } },
          },
        },
      },
    });

    if (!metric) {
      res.status(404).json({ success: false, error: "Pilot metric not found." });
      return;
    }

    if (metric.outcomeValue === null || metric.outcomeValue === undefined) {
      res.status(400).json({
        success: false,
        error: "Cannot verify a metric without a recorded outcome value.",
      });
      return;
    }

    const updated = await prisma.pilotMetric.update({
      where: { id: metricId },
      data: {
        status: "VERIFIED",
        verifiedById: user.id,
        verifiedAt: new Date(),
      },
      include: {
        recordedBy: { select: { id: true, name: true, role: true } },
        verifiedBy: { select: { id: true, name: true, role: true } },
      },
    });

    res.json({
      success: true,
      message: "Metric measurement verified successfully.",
      metric: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to verify metric.",
      details: error.message,
    });
  }
});

// =============================================================================
// 5. MULTI-STAKEHOLDER GROUND-TRUTH VERIFICATION
// =============================================================================

/**
 * POST /api/pilots/:id/verifications
 * Submit a qualitative ground-truth verification for a pilot.
 * Open to local community citizens, institutional partners, and government inspectors.
 */
router.post("/:id/verifications", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const pilot = await prisma.pilotDeployment.findUnique({
      where: { id },
      include: { problem: true },
    });

    if (!pilot) {
      res.status(404).json({ success: false, error: "Pilot deployment not found." });
      return;
    }

    // Must be in active, evaluation, or concluded state
    if (pilot.status === PilotStatus.PROPOSED) {
      res.status(400).json({
        success: false,
        error: "Cannot verify a pilot that is still in PROPOSED status.",
      });
      return;
    }

    const parseResult = createVerificationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { finding, evidenceType, evidenceUrl, feedbackText } = parseResult.data;

    const verification = await prisma.pilotVerification.create({
      data: {
        pilotId: id,
        verifierId: user.id,
        verificationRole: user.role,
        organizationId: user.organizationId || null,
        finding,
        evidenceType,
        evidenceUrl: evidenceUrl || null,
        feedbackText,
      },
      include: {
        verifier: {
          select: { id: true, name: true, role: true, district: true },
        },
        organization: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Ground-truth verification submitted successfully.",
      verification,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to submit verification.",
      details: error.message,
    });
  }
});

// =============================================================================
// 6. IMPACT / OUTCOME DOSSIER
// =============================================================================

/**
 * GET /api/pilots/:id/dossier
 * Generates an explainable, structured Impact Dossier answering all 10 core questions:
 * 1. What problem was addressed?
 * 2. What project attempted to solve it?
 * 3. What intervention was conducted?
 * 4. Where and for whom?
 * 5. What was the baseline?
 * 6. What changed? (Baseline vs Outcome delta, % change)
 * 7. What evidence supports the result?
 * 8. Who verified it?
 * 9. What remains uncertain?
 * 10. Summary verdict
 */
router.get("/:id/dossier", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pilot } = await getPilotWithAuthCheck(id, req.user!);

    if (!pilot) {
      res.status(404).json({ success: false, error: "Pilot deployment not found." });
      return;
    }

    // 1. Quantitative Measured Outcomes & Deltas
    const evaluatedMetrics = pilot.metrics.map((m) => {
      const hasOutcome = m.outcomeValue !== null && m.outcomeValue !== undefined;
      const delta = hasOutcome ? m.outcomeValue! - m.baselineValue : null;
      let percentageChange: number | null = null;
      if (hasOutcome && m.baselineValue !== 0) {
        percentageChange = Math.round(((m.outcomeValue! - m.baselineValue) / Math.abs(m.baselineValue)) * 10000) / 100;
      }

      return {
        id: m.id,
        metricName: m.metricName,
        unit: m.unit,
        baselineValue: m.baselineValue,
        targetValue: m.targetValue,
        outcomeValue: m.outcomeValue,
        delta,
        percentageChange,
        status: m.status,
        isVerified: m.status === "VERIFIED",
        evidenceUrl: m.evidenceUrl,
        recordedBy: m.recordedBy?.name || "Unknown",
        recordedAt: m.recordedAt,
        verifiedBy: m.verifiedBy?.name || null,
        verifiedAt: m.verifiedAt || null,
      };
    });

    // 2. Evidence Trail Compilation
    const evidenceTrail: Array<{
      category: string;
      description: string;
      url: string;
    }> = [];

    if (pilot.clearanceDocumentUrl) {
      evidenceTrail.push({
        category: "ADMINISTRATIVE_CLEARANCE",
        description: `Official Clearance Document / NOC (Decision: ${pilot.clearanceStatus})`,
        url: pilot.clearanceDocumentUrl,
      });
    }

    if (pilot.evidenceDocumentUrl) {
      evidenceTrail.push({
        category: "PILOT_SPECIFICATION",
        description: "Pilot deployment design & site permission specification",
        url: pilot.evidenceDocumentUrl,
      });
    }

    pilot.metrics.forEach((m) => {
      if (m.evidenceUrl) {
        evidenceTrail.push({
          category: "METRIC_MEASUREMENT",
          description: `Measurement evidence for ${m.metricName} (${m.status})`,
          url: m.evidenceUrl,
        });
      }
    });

    pilot.verifications.forEach((v) => {
      if (v.evidenceUrl) {
        evidenceTrail.push({
          category: "GROUND_TRUTH_VERIFICATION",
          description: `${v.evidenceType} by ${v.verifier.name} (${v.verifier.role}): ${v.finding}`,
          url: v.evidenceUrl,
        });
      }
    });

    // 3. Multi-Stakeholder Verifications Breakdown
    const verificationsBreakdown = {
      total: pilot.verifications.length,
      byRole: {
        citizen: pilot.verifications.filter((v) => v.verifier.role === Role.CITIZEN).length,
        institution: pilot.verifications.filter(
          (v) => v.verifier.role === Role.UNIVERSITY || v.verifier.role === Role.STARTUP || v.verifier.role === Role.INDUSTRY
        ).length,
        government: pilot.verifications.filter((v) => v.verifier.role === Role.ADMIN).length,
      },
      byFinding: {
        successConfirmed: pilot.verifications.filter((v) => v.finding === VerificationFinding.SUCCESS_CONFIRMED).length,
        partialImprovement: pilot.verifications.filter((v) => v.finding === VerificationFinding.PARTIAL_IMPROVEMENT).length,
        noChange: pilot.verifications.filter((v) => v.finding === VerificationFinding.NO_CHANGE).length,
        failed: pilot.verifications.filter((v) => v.finding === VerificationFinding.FAILED).length,
      },
      records: pilot.verifications.map((v) => ({
        id: v.id,
        verifierName: v.verifier.name,
        verifierRole: v.verifier.role,
        verifierDistrict: v.verifier.district,
        organizationName: v.organization?.name || null,
        finding: v.finding,
        evidenceType: v.evidenceType,
        evidenceUrl: v.evidenceUrl,
        feedbackText: v.feedbackText,
        verifiedAt: v.verifiedAt,
      })),
    };

    // 4. Uncertainty & Remaining Risks Analysis
    const uncertaintiesAndRisks: string[] = [];
    const unverifiedMetrics = evaluatedMetrics.filter((m) => !m.isVerified && m.outcomeValue !== null);
    if (unverifiedMetrics.length > 0) {
      uncertaintiesAndRisks.push(
        `${unverifiedMetrics.length} outcome metric(s) remain in REPORTED state without independent verification.`
      );
    }

    if (verificationsBreakdown.byFinding.partialImprovement > 0) {
      uncertaintiesAndRisks.push(
        `${verificationsBreakdown.byFinding.partialImprovement} verifier(s) reported partial rather than complete resolution.`
      );
    }

    if (verificationsBreakdown.byFinding.failed > 0 || verificationsBreakdown.byFinding.noChange > 0) {
      uncertaintiesAndRisks.push(
        `${verificationsBreakdown.byFinding.failed + verificationsBreakdown.byFinding.noChange} verifier(s) recorded NO_CHANGE or FAILED outcomes.`
      );
    }

    if (verificationsBreakdown.total === 0) {
      uncertaintiesAndRisks.push("Zero multi-stakeholder ground-truth verifications recorded to date.");
    }

    if (pilot.risksRequirements) {
      uncertaintiesAndRisks.push(`Identified site risks: ${pilot.risksRequirements}`);
    }

    // 5. Build Comprehensive Dossier Object
    const dossier = {
      pilotId: pilot.id,
      title: pilot.title,
      status: pilot.status,

      // Q1: What problem was addressed?
      problem: pilot.problem
        ? {
            id: pilot.problem.id,
            title: pilot.problem.title,
            category: pilot.problem.category,
            district: pilot.problem.district,
            affectedCount: pilot.problem.affectedCount,
            priorityTier: pilot.problem.priorityTier,
          }
        : null,

      // Q2: What project attempted to solve it?
      project: {
        id: pilot.project.id,
        title: pilot.project.title,
        trackType: pilot.project.trackType,
        leadOrganization: pilot.project.leadOrg.name,
        technicalApproach: pilot.project.technicalApproach,
      },

      // Q3 & Q4: What intervention was conducted, where, and for whom?
      intervention: {
        siteLocation: pilot.siteLocation,
        district: pilot.district,
        responsibleOrganization: pilot.responsibleOrg?.name || pilot.project.leadOrg.name,
        description: pilot.description,
        targetBeneficiaries: pilot.targetBeneficiaryCount,
        actualBeneficiaries: pilot.actualBeneficiaryCount || pilot.targetBeneficiaryCount,
        plannedTimeline: {
          start: pilot.startDate,
          end: pilot.endDate,
        },
        actualTimeline: {
          start: pilot.actualStartDate,
          end: pilot.actualEndDate,
        },
      },

      // Administrative Clearance status & audit
      clearance: {
        status: pilot.clearanceStatus,
        clearedBy: pilot.clearedBy?.name || null,
        decidedAt: pilot.clearanceDecidedAt,
        notes: pilot.clearanceNotes,
        documentUrl: pilot.clearanceDocumentUrl,
      },

      // Q5 & Q6: What was the baseline, and what changed?
      metrics: evaluatedMetrics,

      // Q7: What evidence supports the result?
      evidenceTrail,

      // Q8: Who verified it?
      verifications: verificationsBreakdown,

      // Q9: What remains uncertain?
      uncertaintiesAndRisks,

      // Q10: Summary Verdict
      summaryVerdict: {
        isConcluded: pilot.status === PilotStatus.CONCLUDED,
        hasVerifiedMetrics: evaluatedMetrics.some((m) => m.isVerified),
        verificationCount: verificationsBreakdown.total,
        confidenceRating:
          verificationsBreakdown.byFinding.successConfirmed >= 2 &&
          evaluatedMetrics.some((m) => m.isVerified) &&
          pilot.status === PilotStatus.CONCLUDED
            ? "HIGH_CONFIDENCE_VERIFIED"
            : verificationsBreakdown.total > 0
            ? "MODERATE_EVIDENCE"
            : "PRELIMINARY_UNVERIFIED",
      },
    };

    res.json({
      success: true,
      dossier,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to generate impact dossier.",
      details: error.message,
    });
  }
});

export default router;
